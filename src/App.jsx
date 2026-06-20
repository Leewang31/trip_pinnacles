import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

const MAPS_KEY = import.meta.env.VITE_MAPS_KEY

// Module-level cache: query → { photos: string[], reviews: object[] }
const _placeCache = new Map()
const _pendingCallbacks = new Map()

function _fetchPlaceDetails(query) {
  if (!MAPS_KEY) return Promise.resolve({})
  if (_placeCache.has(query)) return Promise.resolve(_placeCache.get(query))
  if (_pendingCallbacks.has(query)) return _pendingCallbacks.get(query)

  const promise = new Promise((resolve) => {
    let retries = 0
    const attempt = () => {
      if (!window.google?.maps?.places) {
        if (++retries > 30) { resolve({}); return }
        setTimeout(attempt, 400); return
      }
      const div = document.createElement('div')
      const svc = new window.google.maps.places.PlacesService(div)
      svc.findPlaceFromQuery(
        { query, fields: ['place_id'] },
        (res, status) => {
          if (status !== 'OK' || !res?.[0]?.place_id) { resolve({}); return }
          svc.getDetails(
            { placeId: res[0].place_id, fields: ['photos', 'reviews', 'rating', 'user_ratings_total'] },
            (place, s2) => {
              if (s2 !== 'OK') { resolve({}); return }
              const data = {
                photos: (place.photos || []).slice(0, 6).map(p => p.getUrl({ maxWidth: 900 })),
                reviews: (place.reviews || []).slice(0, 5),
                rating: place.rating,
                reviewCount: place.user_ratings_total,
              }
              _placeCache.set(query, data)
              resolve(data)
            }
          )
        }
      )
    }
    attempt()
  })
  _pendingCallbacks.set(query, promise)
  return promise
}

function usePlaceDetails(query) {
  const [data, setData] = useState({})
  const tried = useRef(false)
  useEffect(() => {
    if (tried.current || !query) return
    tried.current = true
    _fetchPlaceDetails(query).then(setData)
  }, [query])
  return data
}

// Thin wrappers kept for OverviewView hero photo (single-photo usage)
function usePlacePhotos(query) {
  const { photos = [] } = usePlaceDetails(query)
  return photos
}

// ── Data ──────────────────────────────────────────────────────────────

const TRIP = {
  title: '피나클스 · 주리안 베이',
  subtitle: '별을 보러 가는 이틀',
  dates: '6.20 토 — 6.21 일',
  year: 2026,
  dayDate: { 1: '2026-06-20', 2: '2026-06-21' },
  sun: { sunset: '17:25', sunrise: '07:16' },
}

const PLACES = {
  pinnacles: {
    id: 'pinnacles', name: '피나클스 디저트', en: 'The Pinnacles, Nambung NP',
    category: '자연', address: 'Pinnacles Dr, Nambung WA 6521',
    query: 'Pinnacles Desert Nambung National Park',
    rating: 4.7, reviewCount: 1284,
    hours: '매일 09:30 – 16:30 (디스커버리 센터)', price: '차량당 $17 (국립공원 입장료)',
    blurb: '노란 사막 위로 수천 개의 석회암 기둥이 솟아 있는 곳. 해 질 무렵엔 기둥마다 긴 그림자가 드리우고, 밤이 내리면 빛 공해 없는 하늘에 은하수가 그대로 쏟아진다.',
    tips: ['일몰 1시간 전 도착해 노을 포인트와 주차 자리를 먼저 잡기', '해가 지면 사막 기온이 급강하 — 두꺼운 겉옷 필수', '별구경엔 캠핑 의자·돗자리·따뜻한 음료가 큰 도움'],
    photos: ['노란 사막의 석회암 기둥', '기둥 사이로 지는 노을', '사막 위 은하수'],
    reviews: [
      { name: 'J', rating: 5, date: '2주 전', text: '노을 질 때 기둥 그림자가 길게 늘어지는 풍경이 비현실적이었어요. 해 지고 30분만 기다리면 별이 미친 듯이 보입니다.' },
      { name: '민', rating: 5, date: '1개월 전', text: '낮보다 해질녘이 훨씬 좋아요. 바람이 정말 차가우니 패딩 꼭 챙기세요.' },
      { name: 'H', rating: 4, date: '1개월 전', text: '드라이브 루프를 차로 천천히 돌 수 있어 편했습니다. 화장실은 입구 센터에만 있어요.' },
    ],
  },
  cervantes: {
    id: 'cervantes', name: 'Cervantes Bar & Bistro', en: 'Cervantes Bar & Bistro',
    category: '맛집', address: '10 Cadiz St, Cervantes WA 6511',
    query: 'Cervantes Bar and Bistro Cervantes WA',
    rating: 4.3, reviewCount: 612,
    hours: '매일 11:30 – 20:30', price: '$$ · 메인 $28–$45',
    blurb: '피나클스에서 차로 20분, 따뜻한 비스트로 한 끼. 이 지역은 록 랍스터가 유명하니 현지 해산물로 몸을 녹이기 좋다.',
    tips: ['주말 저녁은 붐빔 — 방문 전 예약 또는 오픈 여부 확인', '랍스터 시즌·시세에 따라 메뉴가 바뀜', '별구경 전 따뜻한 음료를 테이크아웃 해두기'],
    photos: ['록 랍스터 플래터', '비스트로 내부', '창밖 항구 풍경'],
    reviews: [
      { name: 'S', rating: 5, date: '3주 전', text: '랍스터가 신선하고 양도 넉넉했어요. 사막 다녀온 뒤 따뜻한 한 끼로 완벽.' },
      { name: '지', rating: 4, date: '2개월 전', text: '주말 저녁이라 좀 기다렸지만 음식 나오니 다 용서됐습니다.' },
    ],
  },
  jetty: {
    id: 'jetty', name: 'Jurien Bay Jetty', en: 'Jurien Bay Jetty',
    category: '자연', address: 'Jurien Bay Jetty, Jurien Bay WA 6516',
    query: 'Jurien Bay Jetty',
    rating: 4.6, reviewCount: 438,
    hours: '24시간 개방', price: '무료',
    blurb: '탁 트인 인도양과 하얀 모래사장이 이어지는 제티. 아침 공기가 상쾌해 둘이 천천히 걷기 좋은 산책로.',
    tips: ['아침 햇살이 부드러운 8–9시가 산책에 가장 좋음', '물이 맑은 날엔 제티 아래로 물고기가 보임', '근처에 카페가 모여 있어 산책 후 아침 먹기 동선이 짧음'],
    photos: ['제티에서 본 인도양', '하얀 모래사장', '아침 산책길'],
    reviews: [
      { name: 'Y', rating: 5, date: '1주 전', text: '물 색이 정말 예뻐요. 아침에 사람 없을 때 걸으니 둘이 전세 낸 기분.' },
      { name: '현', rating: 4, date: '1개월 전', text: '바람이 좀 불지만 그래서 더 시원합니다. 일출 직후가 베스트.' },
    ],
  },
  meraki: {
    id: 'meraki', name: 'Meraki', en: 'Meraki · Jurien Bay',
    category: '카페', address: 'Bashford St, Jurien Bay WA 6516',
    query: 'Meraki Jurien Bay cafe',
    rating: 4.5, reviewCount: 327,
    hours: '매일 07:00 – 14:00', price: '$$ · 브런치 $18–$26',
    blurb: '현지인 평이 좋은 아늑한 카페. 든든한 브런치와 훌륭한 커피로 하루를 시작하기 좋다. 바다 전망을 원하면 제티 맞은편 Jurien Bay Beach Cafe도 선택지.',
    altNote: '전망 우선이면 → Jurien Bay Beach Cafe (제티 바로 앞, 통유리 바다뷰)',
    tips: ['에그 스크램블·버거 등 든든한 메뉴 추천', '커피 퀄리티가 좋아 테이크아웃도 인기', '전망을 원하면 길 건너 비치 카페로'],
    photos: ['에그 브런치 플레이트', '카페 인테리어', '플랫 화이트 한 잔'],
    reviews: [
      { name: 'K', rating: 5, date: '2주 전', text: '작은 마을에 이런 커피가 있다니. 브런치도 정갈하고 직원분들이 친절해요.' },
      { name: '은', rating: 4, date: '1개월 전', text: '아침에 살짝 웨이팅 있었지만 회전 빨라요. 분위기 아늑함.' },
    ],
  },
  lancelin: {
    id: 'lancelin', name: '란셀린 사구', en: 'Lancelin Sand Dunes',
    category: '액티비티', address: 'Lancelin Sand Dunes, Lancelin WA 6044',
    query: 'Lancelin Sand Dunes',
    rating: 4.6, reviewCount: 956,
    hours: '낮 시간 권장 (가장 더운 한낮은 피하기)', price: '샌드보드 대여 약 $10–$15',
    blurb: '새하얀 백사막 위에서 즐기는 샌드보딩. 거대한 모래 언덕을 미끄러져 내려오는 짜릿함이 이 코스의 하이라이트.',
    tips: ['입구 근처 대여점에서 샌드보드 빌리기', '선글라스·모자·자외선 차단 필수', '보드 바닥에 왁스를 칠하면 훨씬 잘 미끄러짐'],
    photos: ['하얀 모래 언덕', '샌드보딩 순간', '언덕 위에서 본 풍경'],
    reviews: [
      { name: 'T', rating: 5, date: '3주 전', text: '생각보다 언덕이 높아서 스릴 만점. 둘이 보드 하나씩 빌려서 한참 놀았어요.' },
      { name: '수', rating: 4, date: '2개월 전', text: '모래가 정말 곱고 하얘요. 신발에 모래 들어가니 슬리퍼 추천.' },
    ],
  },
  cafe6044: {
    id: 'cafe6044', name: 'Café 6044', en: 'Café 6044 · Lancelin',
    category: '카페', address: 'Gingin Rd, Lancelin WA 6044',
    query: 'Cafe 6044 Lancelin',
    rating: 4.4, reviewCount: 289,
    hours: '매일 07:30 – 14:30', price: '$$ · 메뉴 $14–$24',
    blurb: '란셀린 마을 중심의 트렌디한 해안가 감성 카페. 베이컨 에그 베이글, 아사이 볼, 스무디로 샌드보딩 후의 출출함을 달래기 완벽하다.',
    tips: ['시그니처는 베이컨 에그 베이글', '신선한 아사이 볼·스무디로 더위 식히기', '복귀 운전 전 카페인 충전 포인트'],
    photos: ['베이컨 에그 베이글', '아사이 볼', '해안가 감성 인테리어'],
    reviews: [
      { name: 'M', rating: 5, date: '1주 전', text: '베이글이 진짜 맛있어요. 모래 놀이하고 와서 먹으니 꿀맛.' },
      { name: '라', rating: 4, date: '1개월 전', text: '스무디 종류가 다양하고 시원합니다. 자리도 넉넉해요.' },
    ],
  },
}

const ITEMS = [
  { id: 'i1',  day: 1, start: '14:00', end: '16:30', kind: 'move',  title: '벨몬트 → 피나클스',           note: '인디안 오션 드라이브를 타고 북쪽으로',    dist: '약 200km',  dur: '2시간 30분' },
  { id: 'i2',  day: 1, start: '16:30', end: '17:15', kind: 'place', place: 'pinnacles', title: '피나클스 도착 & 드라이브',  note: '노을 포인트와 주차 자리 잡기' },
  { id: 'i3',  day: 1, start: '17:15', end: '17:45', kind: 'place', place: 'pinnacles', title: '사막 일몰 감상',            note: '일몰 약 17:25 — 붉게 물드는 사막', flag: 'sunset' },
  { id: 'i4',  day: 1, start: '17:45', end: '18:10', kind: 'move',  title: '피나클스 → 세르반테스',         note: '어두워지기 시작 — 감속 운전',            dist: '약 20km',   dur: '20분' },
  { id: 'i5',  day: 1, start: '18:10', end: '19:30', kind: 'place', place: 'cervantes', title: '저녁 식사',                note: 'Cervantes Bar & Bistro · 따뜻한 한 끼' },
  { id: 'i6',  day: 1, start: '19:30', end: '19:50', kind: 'move',  title: '세르반테스 → 피나클스',         note: '별을 보러 다시 — 캥거루 주의',           dist: '약 20km',   dur: '20분' },
  { id: 'i7',  day: 1, start: '19:50', end: '20:40', kind: 'place', place: 'pinnacles', title: '은하수 · 별구경',           note: '빛 공해 없는 사막 위 은하수', flag: 'stars' },
  { id: 'i8',  day: 1, start: '20:40', end: '21:15', kind: 'move',  title: '피나클스 → 주리안 베이 숙소',   note: '야간 운전 — 안전거리 충분히',            dist: '약 50km',   dur: '35분' },
  { id: 'i9',  day: 1, start: '21:15', end: '08:30', kind: 'stay',  title: '주리안 베이 숙소에서 휴식',    note: '충분히 쉬고 둘째 날 아침으로' },
  { id: 'i10', day: 2, start: '08:30', end: '09:30', kind: 'place', place: 'jetty',    title: '아침 산책 · Jurien Bay Jetty', note: '탁 트인 인도양 따라 천천히' },
  { id: 'i11', day: 2, start: '09:30', end: '10:40', kind: 'place', place: 'meraki',   title: '아침 식사 & 커피',           note: 'Meraki 또는 Jurien Bay Beach Cafe' },
  { id: 'i12', day: 2, start: '10:40', end: '12:00', kind: 'move',  title: '주리안 베이 → 란셀린',          note: '남쪽으로 — 백사막을 향해',               dist: '약 110km',  dur: '1시간 15분' },
  { id: 'i13', day: 2, start: '12:00', end: '13:15', kind: 'place', place: 'lancelin', title: '란셀린 사구 · 모래 썰매',    note: '거대한 모래 언덕에서 샌드보딩' },
  { id: 'i14', day: 2, start: '13:15', end: '14:30', kind: 'place', place: 'cafe6044', title: '점심 식사 · Café 6044',      note: '해안가 감성 카페에서 충전' },
  { id: 'i15', day: 2, start: '14:30', end: '16:30', kind: 'move',  title: '란셀린 → 벨몬트 복귀',          note: '주말 오후 차량 흐름 고려 여유롭게',      dist: '약 130km',  dur: '1시간 40분' },
]

const WEATHER = {
  1: { label: '6.20 토', cond: '맑음',     icon: 'clear',  hi: 19, lo: 8,  note: '사막 밤 체감 더 낮음 · 바람', sunset: '17:25' },
  2: { label: '6.21 일', cond: '구름 조금', icon: 'partly', hi: 20, lo: 10, note: '아침 쌀쌀 · 한낮 온화',        sunrise: '07:16' },
}

const CHECKLIST = [
  { t: '야간 운전 방어태세', d: '피나클스·주리안 베이 도로는 밤에 캥거루가 자주 출몰. 시속 70~80km로 감속 운전.' },
  { t: '보온 의류',          d: '사막 밤바람은 뼈가 시릴 정도. 패딩·두꺼운 양말·담요 챙기기.' },
  { t: '차량 점검',          d: '출발 전 타이어 공기압과 주유 상태 미리 확인.' },
]

// ── Utilities ─────────────────────────────────────────────────────────

function startDate(item) {
  return new Date(`${TRIP.dayDate[item.day]}T${item.start}:00+08:00`)
}
function endDate(item) {
  const sd = startDate(item)
  let ed = new Date(`${TRIP.dayDate[item.day]}T${item.end}:00+08:00`)
  if (ed <= sd) ed = new Date(ed.getTime() + 24 * 3600 * 1000)
  return ed
}
const TRIP_START = () => startDate(ITEMS[0])
const TRIP_END   = () => endDate(ITEMS[ITEMS.length - 1])

function fmtClock(d) {
  return d.toLocaleTimeString('en-GB', { timeZone: 'Australia/Perth', hour: '2-digit', minute: '2-digit', hour12: false })
}
function fmtDayLabel(d) {
  return d.toLocaleDateString('ko-KR', { timeZone: 'Australia/Perth', month: 'numeric', day: 'numeric', weekday: 'short' })
}
function activeIdx(now) {
  for (let i = 0; i < ITEMS.length; i++) {
    if (now >= startDate(ITEMS[i]) && now < endDate(ITEMS[i])) return i
  }
  return -1
}
function nextIdx(now) {
  for (let i = 0; i < ITEMS.length; i++) {
    if (startDate(ITEMS[i]) > now) return i
  }
  return -1
}
function itemProgress(item, now) {
  const s = startDate(item).getTime()
  const e = endDate(item).getTime()
  return Math.max(0, Math.min(1, (now.getTime() - s) / (e - s)))
}
function sliderToDate(v) {
  const s = TRIP_START().getTime()
  const e = TRIP_END().getTime()
  return new Date(s + (e - s) * (v / 1000))
}
function dateToSlider(d) {
  const s = TRIP_START().getTime()
  const e = TRIP_END().getTime()
  return Math.max(0, Math.min(1000, Math.round(((d.getTime() - s) / (e - s)) * 1000)))
}
function withinTrip(now) { return now >= TRIP_START() && now <= TRIP_END() }

// ── Small shared components ───────────────────────────────────────────

function Sky() { return <div className="sky" /> }

function StarsRating({ rating }) {
  const full = Math.round(rating)
  return <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
}

function WxIcon({ icon }) { return <span className={`wx-ico ${icon}`} /> }

function PhotoBox({ label, tall }) {
  return (
    <div className={tall ? 'photo tall' : 'photo'}>
      <span className="lbl">{label}</span>
    </div>
  )
}

function PlacePhoto({ query, index = 0, label, tall }) {
  const urls = usePlacePhotos(query, index + 1)
  const url = urls[index]
  const cls = tall ? 'photo tall' : 'photo'
  if (!url) return <div className={cls}><span className="lbl">{label}</span></div>
  return (
    <div className={cls} style={{ padding: 0, overflow: 'hidden' }}>
      <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

// Gallery using multiple photos from one query
function PlaceGallery({ query, labels }) {
  const urls = usePlacePhotos(query, labels.length)
  return (
    <div className="gal">
      {labels.map((lbl, i) => {
        const url = urls[i]
        if (!url) return <div key={i} className="photo"><span className="lbl">{lbl}</span></div>
        return (
          <div key={i} className="photo" style={{ padding: 0, overflow: 'hidden' }}>
            <img src={url} alt={lbl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )
      })}
    </div>
  )
}

function Header({ showBack, onBack, wxText }) {
  return (
    <header className="hdr">
      <button
        className="hdr-back"
        aria-label="뒤로"
        style={{ visibility: showBack ? 'visible' : 'hidden' }}
        onClick={onBack}
      >‹</button>
      <div className="hdr-title">
        <b>피나클스 · 주리안 베이</b>
        <span>1박 2일 · 6.20 토 — 6.21 일</span>
      </div>
      <div className="hdr-spacer" />
      <div className="wx-chip">
        <span className="dot" />
        {wxText}
      </div>
    </header>
  )
}

function TabBar({ activeView, onTabChange }) {
  const isScheduleActive = activeView === 'schedule' || activeView === 'detail'
  return (
    <nav className="tabbar">
      <button className={activeView === 'overview' ? 'on' : ''} onClick={() => onTabChange('overview')}>
        <span className="ic">
          <svg viewBox="0 0 24 24">
            <rect x="3.5" y="4.5" width="17" height="6.5" rx="2" />
            <rect x="3.5" y="14" width="10" height="5.5" rx="2" />
            <circle cx="18" cy="16.5" r="2.5" />
          </svg>
        </span>
        개요
      </button>
      <button className={isScheduleActive ? 'on' : ''} onClick={() => onTabChange('schedule')}>
        <span className="ic">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="13" r="7.5" />
            <path d="M12 9.5V13l2.5 1.8" />
            <path d="M9 3.5h6" />
          </svg>
        </span>
        일정
      </button>
    </nav>
  )
}

// ── Overview view ─────────────────────────────────────────────────────

function OverviewView({ onNavigate }) {
  const w1 = WEATHER[1], w2 = WEATHER[2]

  const renderRow = (it) => {
    if (it.kind === 'move') {
      return (
        <div key={it.id} className="ov-move">
          <div className="time" />
          <div className="line">{it.title} · {it.dur} · {it.dist}</div>
        </div>
      )
    }
    return (
      <div key={it.id} className="ov-item">
        <div className="time">{it.start}</div>
        <div className="card tap" onClick={() => onNavigate(`detail/${it.place}`)}>
          <div className="ttl">{it.title}</div>
          <div className="sub">{it.note}</div>
          <span className="arr">›</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <section className="hero">
        <span className="eyebrow">1박 2일 · 서호주</span>
        <h1>피나클스에서 별을,<br /><em>주리안 베이</em>에서 아침을</h1>
        <p className="lead">노란 사막의 노을과 빛 공해 없는 은하수, 그리고 인도양의 하얀 모래사장으로 떠나는 둘만의 이틀.</p>
        <div className="meta">
          <div><b>2일</b><span>06.20 — 06.21</span></div>
          <div><b>6곳</b><span>주요 방문지</span></div>
          <div><b>~530km</b><span>총 이동</span></div>
        </div>
      </section>

      <PlacePhoto query="Pinnacles Desert Nambung National Park" index={0} label="피나클스 사막" tall />

      <div className="sec-title">여행 날씨 <small>서호주 겨울 · 일몰 17:25</small></div>
      <div className="wx-grid">
        {[w1, w2].map((w, i) => (
          <div key={i} className="wx-card">
            <div className="d">{w.label}</div>
            <div className="c"><WxIcon icon={w.icon} /> {w.cond}</div>
            <div className="t"><span className="hi">{w.hi}°</span><span className="lo">/ {w.lo}°</span></div>
            <div className="n">{w.note}</div>
          </div>
        ))}
      </div>

      {[1, 2].map((d) => {
        const rows = ITEMS.filter((i) => i.day === d && i.kind !== 'stay')
        return (
          <div key={d}>
            <div className="day-head">
              <span className="n">DAY {d}</span>
              <span className="t">{d === 1 ? '사막의 노을과 별' : '바다와 백사막'}</span>
              <span className="meta">{WEATHER[d].label}</span>
            </div>
            <div className="ov-list">{rows.map(renderRow)}</div>
          </div>
        )
      })}

      <div className="divider" />
      <div className="sec-title">여행 전 체크리스트 <small>출발 전 한 번 더</small></div>
      <div className="chk">
        {CHECKLIST.map((c, i) => (
          <div key={i} className="chk-item">
            <div className="mk" />
            <div>
              <div className="t">{c.t}</div>
              <div className="d">{c.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="spacer-lg" />
    </div>
  )
}

// ── Schedule view ─────────────────────────────────────────────────────

function NowBanner({ now, mode, onNavigate }) {
  const ai = activeIdx(now)
  const ni = nextIdx(now)
  const clockStr = fmtClock(now) + (mode === 'live' ? '' : ' · 데모')

  if (ai >= 0) {
    const it = ITEMS[ai]
    const pct = Math.round(itemProgress(it, now) * 100)
    return (
      <div className="now-banner">
        <div className="top">
          <span className="badge-now">지금</span>
          <span style={{ fontSize: '12px', color: 'var(--dim)' }}>
            {it.kind === 'move' ? '이동 중' : it.kind === 'stay' ? '휴식' : '진행 중'}
          </span>
          <span className="clock">{clockStr}</span>
        </div>
        <div className="ttl">{it.title}</div>
        <div className="sub">{it.note}</div>
        <div className="pbar"><i style={{ width: `${pct}%` }} /></div>
        {it.kind === 'place' && (
          <div className="go" onClick={() => onNavigate(`detail/${it.place}`)}>상세 정보 보기 ›</div>
        )}
      </div>
    )
  }

  if (ni >= 0) {
    const it = ITEMS[ni]
    return (
      <div className="now-banner">
        <div className="top">
          <span className="badge-now" style={{ background: 'var(--lav)', boxShadow: '0 0 14px oklch(0.82 0.10 290/0.3)' }}>다음</span>
          <span style={{ fontSize: '12px', color: 'var(--dim)' }}>곧 시작</span>
          <span className="clock">{clockStr}</span>
        </div>
        <div className="ttl">{it.title}</div>
        <div className="sub">{it.start} 시작 · {it.note}</div>
        {it.kind === 'place' && (
          <div className="go" onClick={() => onNavigate(`detail/${it.place}`)}>상세 정보 보기 ›</div>
        )}
      </div>
    )
  }

  const beforeTrip = now < TRIP_START()
  return (
    <div className="now-banner">
      <div className="top">
        <span style={{ fontSize: '12px', color: 'var(--dim)' }}>
          여행 일정이 {beforeTrip ? '아직 시작되지 않았어요' : '모두 끝났어요'}
        </span>
        <span className="clock">{clockStr}</span>
      </div>
      <div className="ttl" style={{ fontSize: '18px' }}>
        {beforeTrip ? '출발을 기다리는 중' : '무사히 다녀왔어요 ✦'}
      </div>
      <div className="sub">아래 데모 모드로 시간을 움직여 일정을 미리 볼 수 있어요.</div>
    </div>
  )
}

function Timeline({ now, onNavigate }) {
  const ai = activeIdx(now)
  const elements = []
  let lastDay = 0

  ITEMS.forEach((it, idx) => {
    if (it.day !== lastDay) {
      lastDay = it.day
      elements.push(
        <div key={`day-${it.day}`} className="tl-day">DAY {it.day} · {WEATHER[it.day].label}</div>
      )
    }

    const isActive = idx === ai
    const isPast   = !isActive && endDate(it) <= now
    const cls      = [it.kind, isActive ? 'active' : '', isPast ? 'past' : ''].filter(Boolean).join(' ')

    let body
    if (it.kind === 'move') {
      body = (
        <div className="move-card">
          <span className="mi">{it.title}</span>
          <span className="meta"><span>{it.dur}</span><span>{it.dist}</span></span>
        </div>
      )
    } else if (it.kind === 'stay') {
      body = (
        <div className="tl-card stay-card">
          <div className="ttl">{it.title}</div>
          <div className="sub">{it.note}</div>
        </div>
      )
    } else {
      const p = PLACES[it.place]
      body = (
        <div className="tl-card" onClick={() => onNavigate(`detail/${it.place}`)}>
          <div className="ch">
            <span className="tag cat">{p.category}</span>
            {isActive && <span className="badge-now">지금</span>}
          </div>
          <div className="ttl">{it.title}</div>
          <div className="sub">{it.note}</div>
          <span className="more">상세 정보 · 지도 보기 ›</span>
        </div>
      )
    }

    elements.push(
      <div key={it.id} className={`tl-item ${cls}`}>
        <div className="time">{it.start}</div>
        <div className="tl-rail"><div className="tl-dot" /></div>
        <div className="tl-body">{body}</div>
      </div>
    )
  })

  return <div className="tl">{elements}</div>
}

function ScheduleView({ mode, demoDate, onModeChange, onDemoChange, onNavigate, now }) {
  return (
    <div className="fade-in">
      <section className="hero" style={{ margin: '6px 0 0' }}>
        <span className="eyebrow">Itinerary</span>
        <h1 style={{ fontSize: '26px', marginTop: '8px' }}>이틀의 타임라인</h1>
      </section>

      <NowBanner now={now} mode={mode} onNavigate={onNavigate} />

      <div className="mode-row">
        <div className="seg">
          <button className={mode === 'live' ? 'on' : ''} onClick={() => onModeChange('live')}>실시간</button>
          <button className={mode === 'demo' ? 'on' : ''} onClick={() => onModeChange('demo')}>데모</button>
        </div>
        <span className="hint">
          {mode === 'live' ? '현재 시각 기준으로 자동 하이라이트' : '시간을 직접 움직여 보기'}
        </span>
      </div>

      {mode === 'demo' && demoDate && (
        <div className="demo-box">
          <div className="row">
            <b>{fmtClock(demoDate)}</b>
            <span>{fmtDayLabel(demoDate)}</span>
          </div>
          <input
            type="range" min="0" max="1000"
            value={dateToSlider(demoDate)}
            onChange={(e) => onDemoChange(sliderToDate(+e.target.value))}
          />
        </div>
      )}

      <Timeline now={now} onNavigate={onNavigate} />
      <div className="spacer-lg" />
    </div>
  )
}

// ── Detail view ───────────────────────────────────────────────────────

function DetailView({ placeId, now }) {
  const p = PLACES[placeId]
  if (!p) return <p style={{ color: 'var(--faint)', padding: '40px 0' }}>장소를 찾을 수 없어요.</p>

  const details  = usePlaceDetails(p.query)
  const photos   = details.photos || []
  const reviews  = details.reviews || []
  const rating   = details.rating ?? p.rating
  const revCount = details.reviewCount ?? p.reviewCount

  const here    = ITEMS.filter((i) => i.place === placeId)
  const ai      = activeIdx(now)
  const mapSrc  = `https://maps.google.com/maps?q=${encodeURIComponent(p.query)}&z=13&output=embed&key=${MAPS_KEY}`
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}`

  return (
    <div className="fade-in">
      {photos[0]
        ? <div className="photo tall" style={{ padding: 0, overflow: 'hidden' }}>
            <img src={photos[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        : <div className="photo tall"><span className="lbl">{p.photos[0]}</span></div>
      }

      <section className="dt-hero">
        <div className="tags" style={{ marginBottom: '10px' }}>
          <span className="tag cat">{p.category}</span>
        </div>
        <h1>{p.name}</h1>
        <div className="en">{p.en}</div>
      </section>

      <div className="dt-meta">
        <StarsRating rating={rating} />
        <span className="dt-rating"><b>{rating.toFixed(1)}</b> · 리뷰 {revCount.toLocaleString()}개</span>
      </div>

      <p className="dt-blurb">{p.blurb}</p>
      {p.altNote && <div className="alt-note">{p.altNote}</div>}

      <div className="sec-title">위치 <small>구글 지도</small></div>
      <div className="map-wrap">
        <iframe loading="lazy" src={mapSrc} title={`${p.name} 지도`} />
      </div>
      <a className="map-open" href={mapLink} target="_blank" rel="noopener noreferrer">
        구글 지도 앱에서 길찾기 ↗
      </a>

      <div className="info-list" style={{ marginTop: '12px' }}>
        <div className="info-row"><span className="k">주소</span><span className="v">{p.address}</span></div>
        <div className="info-row"><span className="k">운영</span><span className="v">{p.hours}</span></div>
        <div className="info-row"><span className="k">비용</span><span className="v">{p.price}</span></div>
      </div>

      <div className="sec-title">우리 일정 <small>이곳에 머무는 시간</small></div>
      <div className="times-here">
        {here.map((it, i) => {
          const isActive = ITEMS.indexOf(it) === ai
          return (
            <div key={i} className={`th-row${isActive ? ' active' : ''}`}>
              <span className="tt">{it.start}–{it.end}</span>
              <span>{it.title}</span>
              {isActive && <span className="badge-now" style={{ marginLeft: 'auto' }}>지금</span>}
            </div>
          )
        })}
      </div>

      <div className="sec-title">팁 <small>가기 전에</small></div>
      <div className="tip-list">
        {p.tips.map((t, i) => (
          <div key={i} className="tip"><span className="b">✦</span><span>{t}</span></div>
        ))}
      </div>

      {photos.length > 0 && (
        <>
          <div className="sec-title">사진 <small>Google Maps 리뷰</small></div>
          <div className="gal">
            {photos.slice(0, 5).map((url, i) => (
              <div key={i} className="photo" style={{ padding: 0, overflow: 'hidden' }}>
                <img src={url} alt={`${p.name} ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sec-title">
        리뷰 <small>{reviews.length > 0 ? `Google Maps · ${revCount.toLocaleString()}개 중` : '불러오는 중…'}</small>
      </div>
      {reviews.length > 0 ? reviews.map((r, i) => (
        <div key={i} className="review">
          <div className="rh">
            {r.profile_photo_url
              ? <img src={r.profile_photo_url} alt={r.author_name} className="av" style={{ borderRadius: '50%', objectFit: 'cover' }} />
              : <div className="av">{r.author_name?.[0]}</div>
            }
            <div>
              <div className="rn">{r.author_name}</div>
              <div className="rd">{r.relative_time_description}</div>
            </div>
            <StarsRating rating={r.rating} />
          </div>
          <div className="rt">{r.text}</div>
        </div>
      )) : (
        <div style={{ color: 'var(--faint)', fontSize: '13px', padding: '12px 0' }}>리뷰를 불러오고 있어요…</div>
      )}
      <div className="spacer-lg" />
    </div>
  )
}

// ── App root ──────────────────────────────────────────────────────────

const DEMO_INIT = new Date(`${TRIP.dayDate[1]}T17:18:00+08:00`)

export default function App() {
  const [view,          setView]          = useState('overview')   // 'overview' | 'schedule' | 'detail'
  const [detailPlaceId, setDetailPlaceId] = useState(null)
  const [scheduleMode,  setScheduleMode]  = useState(() => withinTrip(new Date()) ? 'live' : 'demo')
  const [demoDate,      setDemoDate]      = useState(DEMO_INIT)
  const [liveNow,       setLiveNow]       = useState(new Date())

  // 30-second tick for live mode
  useEffect(() => {
    const id = setInterval(() => setLiveNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const now = scheduleMode === 'live' ? liveNow : demoDate

  // Weather chip — day 1 until night-sleep ends (i9 = ITEMS[8])
  const wxText = useMemo(() => {
    const d = now <= endDate(ITEMS[8]) ? 1 : 2
    const w = WEATHER[d]
    return `${w.label} · ${w.cond} ${w.hi}°/${w.lo}°`
  }, [now])

  const navigate = useCallback((target) => {
    if (target.startsWith('detail/')) {
      setDetailPlaceId(target.replace('detail/', ''))
      setView('detail')
    } else if (target === 'schedule') {
      setView('schedule')
    } else {
      setView('overview')
    }
  }, [])

  const handleTabChange = useCallback((tab) => {
    setView(tab)
    if (tab !== 'detail') setDetailPlaceId(null)
  }, [])

  const handleBack = useCallback(() => {
    setView('schedule')
    setDetailPlaceId(null)
  }, [])

  const handleModeChange = useCallback((m) => {
    setScheduleMode(m)
    if (m === 'demo' && !demoDate) setDemoDate(DEMO_INIT)
  }, [demoDate])

  return (
    <>
      <Sky />
      <div className="app">
        <Header showBack={view === 'detail'} onBack={handleBack} wxText={wxText} />
        <main className="view">
          {view === 'overview' && <OverviewView onNavigate={navigate} />}
          {view === 'schedule' && (
            <ScheduleView
              mode={scheduleMode}
              demoDate={demoDate}
              onModeChange={handleModeChange}
              onDemoChange={setDemoDate}
              onNavigate={navigate}
              now={now}
            />
          )}
          {view === 'detail' && detailPlaceId && (
            <DetailView placeId={detailPlaceId} now={now} />
          )}
        </main>
        <TabBar activeView={view} onTabChange={handleTabChange} />
      </div>
    </>
  )
}
