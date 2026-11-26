import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Text } from '../../components/AppText';
import BigButton from '../../components/BigButton';
import Chip from '../../components/Chip';
import Icon from '../../components/Icon';
import TabTitle from '../../components/TabTitle';
import { getKakaoKey } from '../../lib/api';
import { C, CARD, R, S } from '../../lib/theme';

type Kind = 'HP8' | 'PM9'; // 카카오 장소 분류: 병원 / 약국
type Place = { name: string; category: string; phone: string; address: string; distance: string; x: string; y: string; url: string };
type Sort = 'distance' | 'accuracy';
const SEOUL = { lat: 37.5665, lng: 126.978 }; // 위치를 못 받을 때 (서울시청)
const DEPTS = ['내과', '이비인후과', '정형외과', '소아과', '치과', '안과', '피부과', '산부인과', '비뇨기과', '한의원'];
const RADII = [500, 1000, 2000, 3000];

// 지도 페이지: 카카오 지도 JS. 한 번 열어 두고 앱이 window.run(조건)으로 검색을 시킨다. 결과는 앱으로 보낸다.
// 키가 쓰이는 사이트 주소는 http://localhost (카카오 개발자 콘솔 > 플랫폼 > Web에 등록).
const page = (key: string, lat: number, lng: number) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#m{margin:0;height:100%}</style></head>
<body><div id="m"></div>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false"></script>
<script>
const send = (o) => window.ReactNativeWebView.postMessage(JSON.stringify(o));
let map, ps, center, markers = [], current = [];
if (!window.kakao) send({ error: 'sdk' });
else kakao.maps.load(() => {
  center = new kakao.maps.LatLng(${lat}, ${lng});
  map = new kakao.maps.Map(document.getElementById('m'), { center, level: 5 });
  new kakao.maps.Marker({ map, position: center, title: '내 위치' });
  ps = new kakao.maps.services.Places();
  send({ ready: true });
});
window.run = (q) => {
  markers.forEach((m) => m.setMap(null)); markers = [];
  const S = kakao.maps.services;
  const opts = { location: center, radius: q.radius, category_group_code: q.kind, sort: q.sort === 'accuracy' ? S.SortBy.ACCURACY : S.SortBy.DISTANCE };
  const done = (data, status) => {
    if (status !== S.Status.OK) { current = []; return send({ places: [] }); }
    current = data.slice(0, 15);
    const b = new kakao.maps.LatLngBounds(); b.extend(center);
    current.forEach((p, i) => {
      const pos = new kakao.maps.LatLng(p.y, p.x); b.extend(pos);
      const m = new kakao.maps.Marker({ map, position: pos, title: p.place_name });
      kakao.maps.event.addListener(m, 'click', () => send({ select: i }));
      markers.push(m);
    });
    map.setBounds(b);
    send({ places: current.map((p) => ({ name: p.place_name, category: p.category_name, phone: p.phone, address: p.road_address_name || p.address_name, distance: p.distance, x: p.x, y: p.y, url: p.place_url })) });
  };
  const kw = (q.keyword || '').trim();
  if (kw) ps.keywordSearch(kw, done, opts); else ps.categorySearch(q.kind, done, opts);
};
window.focusPlace = (i) => { const p = current[i]; if (p) { map.setLevel(3); map.panTo(new kakao.maps.LatLng(p.y, p.x)); } };
window.recenter = () => { map.setLevel(4); map.panTo(center); };
</script></body></html>`;

const meters = (d: string) => (Number(d) >= 1000 ? `${(Number(d) / 1000).toFixed(1)}km` : `${d}m`);
const dept = (category: string) => category.split(' > ').slice(2).join(' · '); // "의료,건강 > 병원 > 내과" → "내과"

// 웹 미리보기용 예시 (웹에는 지도가 없어서 목록 화면만 확인하는 용도)
const DEMO: Place[] = [
  { name: '튼튼이비인후과의원', category: '의료,건강 > 병원 > 이비인후과', phone: '02-123-4567', address: '서울 중구 세종대로 110', distance: '180', x: '126.978', y: '37.5665', url: 'https://place.map.kakao.com' },
  { name: '행복내과의원', category: '의료,건강 > 병원 > 내과', phone: '02-765-4321', address: '서울 중구 태평로1가 31', distance: '420', x: '126.977', y: '37.567', url: 'https://place.map.kakao.com' },
  { name: '온누리약국', category: '의료,건강 > 약국', phone: '', address: '서울 중구 세종대로 136', distance: '760', x: '126.976', y: '37.568', url: 'https://place.map.kakao.com' },
];

// 둘 이상 중 하나를 고르는 붙은 막대 (버튼 여러 개가 따로 놓인 것과 모양이 다르다)
function Segmented({ options, value, onChange, big }: { options: [string, string][]; value: string; onChange: (v: string) => void; big?: boolean }) {
  return (
    <View style={styles.seg}>
      {options.map(([v, label]) => (
        <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: v === value }} onPress={() => onChange(v)} style={[styles.segItem, big && styles.segBig, v === value && styles.segOn]}>
          <Text style={[styles.segText, big && { fontSize: 20 }, v === value && { color: C.primary }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Pick({ text, on, onPress }: { text: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.pick, on && styles.pickOn]}>
      <Text style={[styles.pickText, on && { color: '#fff' }]}>{text}</Text>
    </Pressable>
  );
}

// 병원 탭: 내 위치 주변 병원·약국을 지도와 목록으로. 검색(이름·진료과), 진료과 빠른 선택, 거리 범위, 정렬, 자세한 카드(분류·진료과·거리·주소·전화·길 찾기·카카오맵 상세).
export default function Hospital() {
  const web = Platform.OS === 'web';
  // RN 0.88 타입이 ref에 클래스·ScrollView를 바로 못 받아서, 쓰는 함수만 좁게 적고 콜백으로 붙인다
  const ref = useRef<{ injectJavaScript: (s: string) => void } | null>(null);
  const scroller = useRef<{ scrollTo: (o: { y: number; animated?: boolean }) => void } | null>(null);
  const [kind, setKind] = useState<Kind>('HP8');
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState(''); // 실제로 검색에 쓰는 글 (검색 버튼·진료과를 눌렀을 때 바뀜)
  const [radius, setRadius] = useState(2000);
  const [sort, setSort] = useState<Sort>('distance');
  const [key, setKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; real: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [places, setPlaces] = useState<Place[] | null>(web ? DEMO : null);
  const [picked, setPicked] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false); // 검색 조건 패널 펼침

  useEffect(() => {
    if (web) return;
    getKakaoKey().then(setKey);
    (async () => {
      try {
        if ((await Location.requestForegroundPermissionsAsync()).granted) {
          const p = await Location.getCurrentPositionAsync({});
          return setPos({ lat: p.coords.latitude, lng: p.coords.longitude, real: true });
        }
      } catch {}
      setPos({ ...SEOUL, real: false });
    })();
  }, [web]);

  const html = useMemo(() => (key && pos ? page(key, pos.lat, pos.lng) : null), [key, pos]);

  // 조건이 바뀔 때마다 지도 페이지에 검색을 시킨다
  useEffect(() => {
    if (web || !ready) return;
    setPlaces(null);
    setPicked(null);
    ref.current?.injectJavaScript(`window.run(${JSON.stringify({ kind, keyword, radius, sort })});true;`);
  }, [web, ready, kind, keyword, radius, sort]);

  const choose = useCallback((i: number) => {
    setPicked(i);
    ref.current?.injectJavaScript(`window.focusPlace(${i});true;`);
    scroller.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const submit = (text: string) => {
    setInput(text);
    setKeyword(text.trim());
  };
  const pickKind = (k: Kind) => {
    setKind(k);
    submit(''); // 병원↔약국을 바꾸면 검색어는 비운다
  };

  const shown = web ? DEMO.filter((p) => (kind === 'HP8' ? !p.category.includes('약국') : p.category.includes('약국')) && (!keyword || (p.name + p.category).includes(keyword))) : places;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView ref={(r) => { scroller.current = r; }} contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TabTitle title="병원" />

        <View style={styles.group}>
          <Segmented big options={[['HP8', '병원'], ['PM9', '약국']]} value={kind} onChange={(k) => pickKind(k as Kind)} />

          <View style={styles.search}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => submit(input)}
              returnKeyType="search"
              placeholder={kind === 'HP8' ? '병원 이름이나 진료과 검색' : '약국 이름 검색'}
              placeholderTextColor={C.gray}
              style={styles.searchInput}
            />
            {!!input && (
              <Pressable accessibilityRole="button" accessibilityLabel="지우기" onPress={() => submit('')} hitSlop={8} style={styles.clear}>
                <Icon name="close" size={18} color={C.sub} />
              </Pressable>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel="검색" onPress={() => submit(input)} style={styles.go}>
              <Icon name="search" size={22} color="#fff" stroke={2.6} />
            </Pressable>
          </View>

          <View style={styles.panel}>
            <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} style={styles.panelHead}>
              <Text style={styles.panelTitle}>검색 조건</Text>
              <View style={styles.sum}>
                {kind === 'HP8' && <Chip small text={keyword && DEPTS.includes(keyword) ? keyword : '진료과 전체'} />}
                <Chip small text={radius >= 1000 ? `${radius / 1000}km` : `${radius}m`} />
                <Chip small text={sort === 'distance' ? '가까운 순' : '정확한 순'} />
              </View>
              <Icon name={open ? 'up' : 'down'} size={22} color={C.primary} />
            </Pressable>
            {open && (
              <View style={styles.panelBody}>
                {kind === 'HP8' && (
                  <View style={styles.sec}>
                    <Text style={styles.secLabel}>진료과</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                      <Pick text="전체" on={!keyword} onPress={() => submit('')} />
                      {DEPTS.map((d) => (
                        <Pick key={d} text={d} on={keyword === d} onPress={() => submit(d)} />
                      ))}
                    </ScrollView>
                  </View>
                )}
                <View style={styles.sec}>
                  <Text style={styles.secLabel}>거리</Text>
                  <Segmented options={RADII.map((r) => [String(r), r >= 1000 ? `${r / 1000}km` : `${r}m`] as [string, string])} value={String(radius)} onChange={(v) => setRadius(Number(v))} />
                </View>
                <View style={styles.sec}>
                  <Text style={styles.secLabel}>정렬</Text>
                  <Segmented options={[['distance', '가까운 순'], ['accuracy', '정확한 순']]} value={sort} onChange={(v) => setSort(v as Sort)} />
                </View>
              </View>
            )}
          </View>
          {pos && !pos.real && <Text style={styles.note}>내 위치를 알 수 없어 서울시청 근처를 보여 줘요. 설정에서 위치를 허용해 주세요.</Text>}
        </View>

        <View style={styles.group}>
          {web ? (
            <View style={[styles.map, styles.webMap]}>
              <Text style={styles.note}>지도는 휴대폰 앱에서만 보여요 (아래는 예시 목록)</Text>
            </View>
          ) : key === '' ? (
            <Text style={styles.note}>지도 키가 없어서 지도를 열 수 없어요.</Text>
          ) : !html ? (
            <ActivityIndicator size="large" color={C.primary} />
          ) : (
            <View style={styles.map}>
              <WebView
                ref={(r: any) => { ref.current = r; }}
                originWhitelist={['*']}
                source={{ html, baseUrl: 'http://localhost' }}
                onMessage={(e) => {
                  const m = JSON.parse(e.nativeEvent.data);
                  if (m.error) setError(true);
                  else if (m.ready) setReady(true);
                  else if (m.places) setPlaces(m.places);
                  else if (typeof m.select === 'number') setPicked(m.select);
                }}
                onError={() => setError(true)}
                scrollEnabled={false}
                style={{ flex: 1 }}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="내 위치로" onPress={() => ref.current?.injectJavaScript('window.recenter();true;')} style={styles.here}>
                <Text style={styles.hereText}>내 위치</Text>
              </Pressable>
            </View>
          )}
          {error && <Text style={styles.note}>지도를 불러오지 못했어요. 카카오 개발자 콘솔에 http://localhost 주소가 등록돼 있는지 확인해 주세요.</Text>}
        </View>

        <View style={styles.group}>
          {!error && !web && html && shown === null && <Text style={styles.note}>찾고 있어요…</Text>}
          {shown && <Text style={styles.count}>{shown.length ? `${kind === 'HP8' ? '병원' : '약국'} ${shown.length}곳` : '조건에 맞는 곳이 없어요. 거리를 넓히거나 검색어를 바꿔 보세요.'}</Text>}
          {shown?.map((p, i) => {
            const isPharm = p.category.includes('약국');
            const sub = dept(p.category);
            return (
              <Pressable key={`${p.x},${p.y}`} accessibilityRole="button" onPress={() => choose(i)} style={({ pressed }) => [styles.card, picked === i && styles.cardOn, pressed && { opacity: 0.9 }]}>
                <View style={styles.tags}>
                  <Chip small solid={isPharm ? C.orange : C.primary} text={isPharm ? '약국' : '병원'} />
                  {!!sub && <Chip small text={sub} />}
                  <Chip small text={meters(p.distance)} />
                </View>
                <Text style={styles.name}>{p.name}</Text>
                <View style={styles.info}>
                  <Text style={styles.infoLabel}>주소</Text>
                  <Text style={styles.infoText}>{p.address}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.infoLabel}>전화</Text>
                  <Text style={styles.infoText}>{p.phone || '등록된 번호가 없어요'}</Text>
                </View>
                <View style={styles.actions}>
                  {!!p.phone && <View style={{ flex: 1 }}><BigButton label="전화" variant="secondary" onPress={() => Linking.openURL(`tel:${p.phone}`)} /></View>}
                  <View style={{ flex: 1 }}><BigButton label="길찾기" onPress={() => Linking.openURL(`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.y},${p.x}`)} /></View>
                  <View style={{ flex: 1 }}><BigButton label="상세" variant="secondary" onPress={() => Linking.openURL(p.url)} /></View>
                </View>
              </Pressable>
            );
          })}
          {!!shown?.length && <Text style={styles.note}>영업시간·후기는 "상세"(카카오맵)에서 볼 수 있어요.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { paddingHorizontal: S.page, paddingTop: 8, paddingBottom: 100, gap: S.section },
  group: { gap: S.gap },
  seg: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 16, padding: 4, gap: 4 },
  segItem: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segBig: { minHeight: 52 },
  segOn: { backgroundColor: '#fff', shadowColor: '#1E3A2F', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segText: { fontSize: 18, fontWeight: '800', color: C.sub },
  search: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, paddingLeft: 20, paddingRight: 8, gap: 4 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 52, fontSize: 18, color: C.text },
  clear: { width: 44, height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  go: { width: 44, height: 44, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: R.card, backgroundColor: C.soft, overflow: 'hidden' },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: S.in, padding: S.item },
  panelTitle: { fontSize: 16, fontWeight: '800', color: C.sub },
  sum: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panelBody: { paddingHorizontal: S.item, paddingBottom: S.item, gap: S.gap },
  sec: { gap: 8, borderTopWidth: 1, borderTopColor: C.mist, paddingTop: S.in },
  secLabel: { fontSize: 16, fontWeight: '800', color: C.sub },
  chipRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pick: { minHeight: 44, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: C.mist, backgroundColor: C.card, justifyContent: 'center' },
  pickOn: { backgroundColor: C.primary, borderColor: C.primary },
  pickText: { fontSize: 16, fontWeight: '800', color: C.primary },
  note: { fontSize: 16, lineHeight: 24, color: C.sub },
  map: { height: 270, borderRadius: R.card, overflow: 'hidden', backgroundColor: C.soft },
  webMap: { alignItems: 'center', justifyContent: 'center', padding: S.page },
  here: { position: 'absolute', right: 12, bottom: 12, minHeight: 44, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.card, justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  hereText: { fontSize: 16, fontWeight: '800', color: C.primary },
  count: { fontSize: 18, fontWeight: '800', color: C.text },
  card: { ...CARD, padding: S.pad, gap: S.in, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { backgroundColor: C.peach, borderColor: C.orange },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  name: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.text },
  info: { flexDirection: 'row', gap: S.in },
  infoLabel: { width: 44, fontSize: 16, fontWeight: '800', color: C.sub },
  infoText: { flex: 1, fontSize: 18, lineHeight: 24, color: C.text },
  actions: { flexDirection: 'row', gap: S.in, marginTop: 4 },
});
