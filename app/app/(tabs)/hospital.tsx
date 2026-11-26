import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Text } from '../../components/AppText';
import Chip from '../../components/Chip';
import BigButton from '../../components/BigButton';
import { getKakaoKey } from '../../lib/api';
import { C, CARD, R, S } from '../../lib/theme';

type Kind = 'HP8' | 'PM9'; // 카카오 장소 분류: 병원 / 약국
type Place = { name: string; address: string; phone: string; distance: string; x: string; y: string };
const SEOUL = { lat: 37.5665, lng: 126.978 }; // 위치를 못 받을 때 (서울시청)

// 지도 페이지: 카카오 지도 JS로 내 주변 병원·약국을 찾아 지도에 찍고, 목록을 앱에 보낸다.
// 키가 쓰이는 사이트 주소는 http://localhost (카카오 개발자 콘솔 > 플랫폼 > Web에 등록해야 한다).
const page = (key: string, lat: number, lng: number, kind: Kind) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#m{margin:0;height:100%}</style></head>
<body><div id="m"></div>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false"></script>
<script>
const send = (o) => window.ReactNativeWebView.postMessage(JSON.stringify(o));
if (!window.kakao) send({ error: 'sdk' });
else kakao.maps.load(() => {
  const c = new kakao.maps.LatLng(${lat}, ${lng});
  const map = new kakao.maps.Map(document.getElementById('m'), { center: c, level: 5 });
  new kakao.maps.Marker({ map, position: c, title: '내 위치' });
  new kakao.maps.services.Places().categorySearch('${kind}', (data, status) => {
    if (status !== kakao.maps.services.Status.OK) return send({ places: [] });
    data.forEach((p) => new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(p.y, p.x), title: p.place_name }));
    send({ places: data.slice(0, 15).map((p) => ({ name: p.place_name, address: p.road_address_name || p.address_name, phone: p.phone, distance: p.distance, x: p.x, y: p.y })) });
  }, { location: c, radius: 2000, sort: kakao.maps.services.SortBy.DISTANCE });
});
</script></body></html>`;

const meters = (d: string) => (Number(d) >= 1000 ? `${(Number(d) / 1000).toFixed(1)}km` : `${d}m`);

// 병원 탭: 내 위치 주변 병원·약국을 지도와 목록으로 (위치 권한이 없으면 서울시청 기준)
export default function Hospital() {
  const [kind, setKind] = useState<Kind>('HP8');
  const [key, setKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; real: boolean } | null>(null);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
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
  }, []);

  const html = useMemo(() => (key && pos ? page(key, pos.lat, pos.lng, kind) : null), [key, pos, kind]);
  const pickKind = useCallback((k: Kind) => {
    setPlaces(null);
    setError(false);
    setKind(k);
  }, []);

  if (Platform.OS === 'web')
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <Text style={styles.center}>지도는 휴대폰 앱에서만 볼 수 있어요</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
        <Text style={styles.head}>가까운 병원·약국</Text>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}><BigButton label="병원" small variant={kind === 'HP8' ? 'primary' : 'secondary'} onPress={() => pickKind('HP8')} /></View>
          <View style={{ flex: 1 }}><BigButton label="약국" small variant={kind === 'PM9' ? 'primary' : 'secondary'} onPress={() => pickKind('PM9')} /></View>
        </View>
        {pos && !pos.real && <Text style={styles.note}>내 위치를 알 수 없어 서울시청 근처를 보여 줘요. 설정에서 위치를 허용해 주세요.</Text>}

        {key === '' ? (
          <Text style={styles.note}>지도 키가 없어서 지도를 열 수 없어요.</Text>
        ) : !html ? (
          <ActivityIndicator size="large" color={C.primary} />
        ) : (
          <View style={styles.map}>
            <WebView
              key={`${kind}${pos?.lat}`}
              originWhitelist={['*']}
              source={{ html, baseUrl: 'http://localhost' }}
              onMessage={(e) => {
                const m = JSON.parse(e.nativeEvent.data);
                if (m.error) setError(true);
                else setPlaces(m.places);
              }}
              onError={() => setError(true)}
              scrollEnabled={false}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {error && <Text style={styles.note}>지도를 불러오지 못했어요. 카카오 개발자 콘솔에 http://localhost 주소가 등록돼 있는지 확인해 주세요.</Text>}
        {!error && html && places === null && <Text style={styles.note}>찾고 있어요…</Text>}
        {places?.length === 0 && <Text style={styles.note}>가까운 곳을 찾지 못했어요</Text>}
        </View>
        <View style={styles.group}>
        {places?.map((p) => (
          <View key={`${p.x},${p.y}`} style={styles.card}>
            <Text style={styles.name}>{p.name}</Text>
            <Chip small text={meters(p.distance)} />
            <Text style={styles.sub}>{p.address}</Text>
            {!!p.phone && (
              <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${p.phone}`)} style={styles.link}>
                <Text style={styles.linkText}>전화 {p.phone}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => Linking.openURL(`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.y},${p.x}`)}
              style={styles.link}
            >
              <Text style={styles.linkText}>길 찾기 ›</Text>
            </Pressable>
          </View>
        ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { paddingHorizontal: S.page, paddingTop: 7, paddingBottom: 102, gap: S.section },
  group: { gap: S.gap },
  head: { fontSize: 20, fontWeight: '800', color: C.text, minHeight: 41, textAlignVertical: 'center' },
  center: { fontSize: 19, color: C.sub, textAlign: 'center', margin: 27 },
  pair: { flexDirection: 'row', gap: S.in },
  note: { fontSize: 17, lineHeight: 24, color: C.sub },
  map: { height: 300, borderRadius: R.card, overflow: 'hidden', backgroundColor: C.soft },
  card: { ...CARD, padding: S.item, gap: S.tight },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 17, lineHeight: 24, color: C.sub },
  link: { minHeight: 41, justifyContent: 'center' },
  linkText: { fontSize: 19, fontWeight: '800', color: C.primary },
});
