/* 설정값 (Firebase 주소, 호가 단위, 포인트 값 등) */
const FIREBASE_URL="https://point-7419d-default-rtdb.asia-southeast1.firebasedatabase.app/data.json";
const BASE=FIREBASE_URL.replace(/data\.json$/,'');
const STEP=10,MATH_DAYS=30,MATH_POINTS=300,MATH_RETRY_POINTS=0,CHECKIN_POINTS=10,MAX_Q=5;
const CIRCLED=['①','②','③','④','⑤'];
