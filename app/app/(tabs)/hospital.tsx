import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Text } from '../../components/AppText';
import Chip from '../../components/Chip';
import Icon from '../../components/Icon';
import { getKakaoKey } from '../../lib/api';
import { C, S } from '../../lib/theme';

type Kind = 'HP8' | 'PM9'; // 카카오 장소 분류: 병원 / 약국
type Place = { name: string; category: string; phone: string; address: string; distance: string; x: string; y: string; url: string };
type Sort = 'distance' | 'accuracy';
const SEOUL = { lat: 37.5665, lng: 126.978 }; // 위치를 못 받을 때 (서울시청)
const DEPTS = ['내과', '이비인후과', '정형외과', '소아과', '치과', '안과', '피부과', '산부인과', '비뇨기과', '한의원'];

// 지도 페이지: 카카오 지도 JS. 한 번 열어 두고 앱이 window.run(조건)으로 검색을 시킨다. 결과는 앱으로 보낸다.
// 핀은 번호가 적힌 물방울: 골라진 곳은 산호색으로 커진다. 키가 쓰이는 사이트 주소는 http://localhost (카카오 개발자 콘솔 > 플랫폼 > Web에 등록).
const page = (key: string, lat: number, lng: number) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#m{margin:0;height:100%}</style></head>
<body><div id="m"></div>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false"></script>
<script>
const send = (o) => window.ReactNativeWebView.postMessage(JSON.stringify(o));
let map, ps, center, overlays = [], current = [], sel = 0;
const pin = (i) => {
  const on = i === sel, z = on ? 46 : 38, d = document.createElement('div');
  d.style.cssText = 'width:' + z + 'px;height:' + z + 'px;border:3px solid #fff;border-radius:50% 50% 50% 6px;transform:rotate(-45deg);background:' + (on ? '#B8401F' : '#1F5E52') + ';box-shadow:0 3px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;box-sizing:border-box';
  d.innerHTML = '<span style="transform:rotate(45deg);color:#fff;font:900 17px sans-serif">' + (i + 1) + '</span>';
  d.onclick = () => send({ select: i });
  return d;
};
const draw = () => {
  overlays.forEach((o) => o.setMap(null));
  overlays = current.map((p, i) => new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(p.y, p.x), content: pin(i), yAnchor: 1, zIndex: i === sel ? 5 : 1 }));
};
if (!window.kakao) send({ error: 'sdk' });
else kakao.maps.load(() => {
  center = new kakao.maps.LatLng(${lat}, ${lng});
  map = new kakao.maps.Map(document.getElementById('m'), { center, level: 5 });
  new kakao.maps.Marker({ map, position: center, title: '내 위치' });
  ps = new kakao.maps.services.Places();
  send({ ready: true });
});
window.run = (q) => {
  const S = kakao.maps.services;
  const opts = { location: center, radius: q.radius, category_group_code: q.kind, sort: q.sort === 'accuracy' ? S.SortBy.ACCURACY : S.SortBy.DISTANCE };
  const done = (data, status) => {
    sel = 0;
    if (status !== S.Status.OK) { current = []; draw(); return send({ places: [] }); }
    current = data.slice(0, 15);
    draw();
    const b = new kakao.maps.LatLngBounds(); b.extend(center);
    current.forEach((p) => b.extend(new kakao.maps.LatLng(p.y, p.x)));
    map.setBounds(b);
    send({ places: current.map((p) => ({ name: p.place_name, category: p.category_name, phone: p.phone, address: p.road_address_name || p.address_name, distance: p.distance, x: p.x, y: p.y, url: p.place_url })) });
  };
  const kw = (q.keyword || '').trim();
  if (kw) ps.keywordSearch(kw, done, opts); else ps.categorySearch(q.kind, done, opts);
};
window.focusPlace = (i) => { const p = current[i]; if (p) { sel = i; draw(); map.setLevel(3); map.panTo(new kakao.maps.LatLng(p.y, p.x)); } };
window.recenter = () => { map.setLevel(4); map.panTo(center); };
window.research = (q) => { center = map.getCenter(); window.run(q); };
</script></body></html>`;

const meters = (d: string) => (Number(d) >= 1000 ? `${(Number(d) / 1000).toFixed(1)}km` : `${d}m`);
const dept = (category: string) => category.split(' > ').slice(2).join(', '); // "의료,건강 > 병원 > 내과" → "내과"

// 웹 미리보기용 예시 (웹에는 지도가 없어서 목록 화면만 확인하는 용도)
const DEMO: Place[] = [
  { name: '튼튼이비인후과의원', category: '의료,건강 > 병원 > 이비인후과', phone: '02-123-4567', address: '서울 중구 세종대로 110', distance: '180', x: '126.978', y: '37.5665', url: 'https://place.map.kakao.com' },
  { name: '행복내과의원', category: '의료,건강 > 병원 > 내과', phone: '02-765-4321', address: '서울 중구 태평로1가 31', distance: '420', x: '126.977', y: '37.567', url: 'https://place.map.kakao.com' },
  { name: '온누리약국', category: '의료,건강 > 약국', phone: '', address: '서울 중구 세종대로 136', distance: '760', x: '126.976', y: '37.568', url: 'https://place.map.kakao.com' },
];

// 병원 / 약국 전환: 연초록 알약 막대 안에서 고른 쪽이 흰색으로 올라온다
function Tabs({ value, onChange }: { value: Kind; onChange: (k: Kind) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.seg}>
      {([['HP8', '병원'], ['PM9', '약국']] as [Kind, string][]).map(([v, label]) => (
        <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: v === value }} onPress={() => onChange(v)} style={[styles.segItem, v === value && styles.segOn]}>
          <Text style={[styles.segText, v === value && { color: C.primary, fontWeight: '800' }]}>{label}</Text>
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

function Actions({ p }: { p: Place }) {
  return (
    <View style={styles.actions}>
      {!!p.phone && (
        <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${p.phone}`)} style={({ pressed }) => [styles.act, { backgroundColor: C.fill }, pressed && { opacity: 0.8 }]}>
          <Icon name="phone" size={24} color={C.primary} />
          <Text style={[styles.actText, { color: C.primary }]}>전화</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.y},${p.x}`)} style={({ pressed }) => [styles.act, { backgroundColor: C.primary }, pressed && { opacity: 0.85 }]}>
        <Icon name="map" size={24} color="#fff" />
        <Text style={[styles.actText, { color: '#fff' }]}>길찾기</Text>
      </Pressable>
    </View>
  );
}

// 병원 탭: 지도를 화면에 고정하고, 위에 제목·병원/약국 전환·검색·조건 칩, 아래에서 올라오는 판(바텀시트)에 고른 곳 하나 또는 목록.
export default function Hospital() {
  const web = Platform.OS === 'web';
  // RN 0.88 타입이 ref에 클래스를 바로 못 받아서, 쓰는 함수만 좁게 적고 콜백으로 붙인다
  const ref = useRef<{ injectJavaScript: (s: string) => void } | null>(null);
  const params = useLocalSearchParams<{ q?: string; k?: string }>();
  const [kind, setKind] = useState<Kind>('HP8');
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState(''); // 실제로 검색에 쓰는 글 (검색 버튼·진료과를 눌렀을 때 바뀜)
  const [radius, setRadius] = useState(2000);
  const [sort, setSort] = useState<Sort>('distance');
  const [key, setKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; real: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [places, setPlaces] = useState<Place[] | null>(web ? DEMO : null);
  const [picked, setPicked] = useState(0);
  const [error, setError] = useState(false);
  const [full, setFull] = useState(false); // 판을 위로 올려 목록을 본다
  const [sheetH, setSheetH] = useState(300);

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

  // 내 약 카드의 병원·약국 옆 검색 버튼으로 열렸으면 그 이름을 바로 검색한다
  useEffect(() => {
    if (!params.q) return;
    setKind(params.k === 'PM9' ? 'PM9' : 'HP8');
    setInput(params.q);
    setKeyword(params.q);
  }, [params.q, params.k]);

  const html = useMemo(() => (key && pos ? page(key, pos.lat, pos.lng) : null), [key, pos]);
  const query = { kind, keyword, radius, sort };

  // 조건이 바뀔 때마다 지도 페이지에 검색을 시킨다
  useEffect(() => {
    if (web || !ready) return;
    setPlaces(null);
    setPicked(0);
    ref.current?.injectJavaScript(`window.run(${JSON.stringify({ kind, keyword, radius, sort })});true;`);
  }, [web, ready, kind, keyword, radius, sort]);

  const choose = (i: number) => {
    setPicked(i);
    setFull(false);
    ref.current?.injectJavaScript(`window.focusPlace(${i});true;`);
  };

  const submit = (text: string) => {
    setInput(text);
    setKeyword(text.trim());
  };
  const pickKind = (k: Kind) => {
    setKind(k);
    submit(''); // 병원↔약국을 바꾸면 검색어는 비운다
  };

  const shown = web ? DEMO.filter((p) => (kind === 'HP8' ? !p.category.includes('약국') : p.category.includes('약국')) && (!keyword || (p.name + p.category).includes(keyword))) : places;
  const sel = shown?.[picked] ?? shown?.[0];
  const label = kind === 'HP8' ? '병원' : '약국';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>병원</Text>
          <Tabs value={kind} onChange={pickKind} />
        </View>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => submit(input)}
              returnKeyType="search"
              placeholder={kind === 'HP8' ? '병원 이름이나 진료과' : '약국 이름'}
              placeholderTextColor={C.gray}
              style={styles.searchInput}
            />
            {!!input && (
              <Pressable accessibilityRole="button" accessibilityLabel="지우기" onPress={() => submit('')} hitSlop={8} style={styles.clear}>
                <Icon name="close" size={18} color={C.sub} />
              </Pressable>
            )}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="찾기" onPress={() => submit(input)} style={styles.go}>
            <Icon name="search" size={24} color={C.primary} stroke={2.6} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll} keyboardShouldPersistTaps="handled">
          <Pick text="전체" on={!keyword && radius === 2000 && sort === 'distance'} onPress={() => { submit(''); setRadius(2000); setSort('distance'); }} />
          <Pick text="1km 이내" on={radius === 1000} onPress={() => setRadius(radius === 1000 ? 2000 : 1000)} />
          <Pick text="정확한 순" on={sort === 'accuracy'} onPress={() => setSort(sort === 'accuracy' ? 'distance' : 'accuracy')} />
          {kind === 'HP8' && DEPTS.map((d) => <Pick key={d} text={d} on={keyword === d} onPress={() => submit(keyword === d ? '' : d)} />)}
        </ScrollView>
        {pos && !pos.real && <Text style={styles.note}>내 위치를 알 수 없어 서울시청 근처를 보여 줘요. 설정에서 위치를 허용해 주세요.</Text>}
      </View>

      <View style={styles.mapBox}>
        {web ? (
          <View style={styles.webMap}>
            <Text style={styles.note}>지도는 휴대폰 앱에서만 보여요 (아래는 예시 목록)</Text>
          </View>
        ) : key === '' ? (
          <View style={styles.webMap}><Text style={styles.note}>지도 키가 없어서 지도를 열 수 없어요.</Text></View>
        ) : !html ? (
          <View style={styles.webMap}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : (
          <WebView
            ref={(r: any) => { ref.current = r; }}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'http://localhost' }}
            onMessage={(e) => {
              const m = JSON.parse(e.nativeEvent.data);
              if (m.error) setError(true);
              else if (m.ready) setReady(true);
              else if (m.places) setPlaces(m.places);
              else if (typeof m.select === 'number') choose(m.select);
            }}
            onError={() => setError(true)}
            scrollEnabled={false}
            style={{ flex: 1 }}
          />
        )}
        {error && <Text style={[styles.note, styles.errorNote]}>지도를 불러오지 못했어요. 카카오 개발자 콘솔에 http://localhost 주소가 등록돼 있는지 확인해 주세요.</Text>}

        {!full && !web && (
          <>
            <Pressable accessibilityRole="button" onPress={() => ref.current?.injectJavaScript(`window.research(${JSON.stringify(query)});true;`)} style={[styles.fab, { left: 16, bottom: sheetH + 16 }]}>
              <Icon name="search" size={20} color={C.primary} stroke={2.6} />
              <Text style={styles.fabText}>이 지역 다시 찾기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="내 위치로" onPress={() => ref.current?.injectJavaScript('window.recenter();true;')} style={[styles.fab, { right: 16, bottom: sheetH + 16 }]}>
              <Icon name="locate" size={20} color={C.primary} stroke={2.6} />
              <Text style={styles.fabText}>내 위치</Text>
            </Pressable>
          </>
        )}

        {/* 아래에서 올라오는 판: 평소엔 고른 곳 하나, "목록 보기"를 누르면 올라와서 목록이 판 안에서만 스크롤 */}
        <View accessibilityLabel="찾은 곳" onLayout={(e) => !full && setSheetH(e.nativeEvent.layout.height)} style={[styles.sheet, full && styles.sheetFull]}>
          <Pressable accessibilityRole="button" accessibilityLabel={full ? '지도 크게 보기' : '목록 보기'} onPress={() => setFull((f) => !f)} style={styles.grab}>
            <View style={styles.grabBar} />
          </Pressable>
          <View style={styles.sheetHead}>
            <View style={styles.sheetTitle}>
              <Icon name="hospital" size={22} color={C.primary} />
              <Text style={styles.sheetTitleText}>{shown ? `가까운 ${label} ${shown.length}곳` : `${label}을 찾고 있어요`}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setFull((f) => !f)} style={styles.toggle}>
              <Text style={styles.toggleText}>{full ? '지도 크게 보기' : '목록 보기'}</Text>
            </Pressable>
          </View>
          {shown && shown.length === 0 && <Text style={[styles.note, { paddingHorizontal: 16, paddingBottom: 16 }]}>조건에 맞는 곳이 없어요. 검색어나 조건을 바꿔 보세요.</Text>}
          {!full && !!sel && (
            <View style={styles.peek}>
              <PlaceBody p={sel} num={(shown?.indexOf(sel) ?? 0) + 1} on />
              <Actions p={sel} />
            </View>
          )}
          {full && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {shown?.map((p, i) => (
                <View key={`${p.x},${p.y}`} style={[styles.item, picked === i && styles.itemOn]}>
                  <Pressable accessibilityRole="button" onPress={() => choose(i)}>
                    <PlaceBody p={p} num={i + 1} on={picked === i} />
                  </Pressable>
                  <Actions p={p} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function PlaceBody({ p, num, on }: { p: Place; num: number; on: boolean }) {
  const sub = dept(p.category);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.nameRow}>
        <View style={[styles.num, { backgroundColor: on ? C.orange : C.primary }]}>
          <Text style={styles.numText}>{num}</Text>
        </View>
        <Text style={styles.name}>{p.name}</Text>
        <Chip small solid={on ? C.primary : undefined} text={meters(p.distance)} />
      </View>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
      <Text style={styles.addr}>{p.address}</Text>
      {!p.phone && <Text style={styles.sub}>등록된 전화번호가 없어요</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  head: { paddingHorizontal: S.page, paddingTop: 12, gap: 10, backgroundColor: C.page, zIndex: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: C.text },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 26, backgroundColor: C.fill },
  segItem: { minHeight: 44, borderRadius: 22, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#fff', shadowColor: '#1E3A2F', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segText: { fontSize: 18, fontWeight: '700', color: C.sub },
  searchRow: { flexDirection: 'row', gap: 8 },
  search: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, paddingLeft: 20, paddingRight: 8, gap: 4 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 52, fontSize: 18, color: C.text },
  clear: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  go: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#1E3A2F', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  chipScroll: { marginHorizontal: -S.page, flexGrow: 0 },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: S.page, paddingTop: 2, paddingBottom: 8 },
  pick: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', shadowColor: '#1E3A2F', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  pickOn: { backgroundColor: C.primary },
  pickText: { fontSize: 16, fontWeight: '800', color: C.primary },
  note: { fontSize: 16, lineHeight: 24, color: C.sub },
  mapBox: { flex: 1, backgroundColor: C.fill },
  webMap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.page },
  errorNote: { position: 'absolute', top: 8, left: 16, right: 16 },
  fab: { position: 'absolute', minHeight: 48, borderRadius: 24, paddingHorizontal: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  fabText: { fontSize: 16, fontWeight: '800', color: C.primary },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#1E3A2F', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: -6 }, elevation: 8 },
  sheetFull: { top: 0 },
  grab: { minHeight: 28, alignItems: 'center', paddingTop: 10 },
  grabBar: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#B7C6BE' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  sheetTitleText: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
  toggle: { minHeight: 44, borderRadius: 22, backgroundColor: C.fill, paddingHorizontal: 14, justifyContent: 'center' },
  toggleText: { fontSize: 16, fontWeight: '800', color: C.primary },
  peek: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, borderWidth: 2, borderColor: C.primary, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  item: { borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  itemOn: { borderWidth: 2, borderColor: C.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
  sub: { fontSize: 16, color: C.sub },
  addr: { fontSize: 18, color: C.text },
  actions: { flexDirection: 'row', gap: 10 },
  act: { flex: 1, minHeight: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  actText: { fontSize: 20, fontWeight: '800' },
});
