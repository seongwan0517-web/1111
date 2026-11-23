/* 설정값 (Firebase 주소, 호가 단위, 포인트 값 등) */
const FIREBASE_URL="https://point-7419d-default-rtdb.asia-southeast1.firebasedatabase.app/";
const BASE=FIREBASE_URL;
/* Firebase 웹 API 키: 공개되어도 괜찮은 값입니다(접근 제어는 DB 보안 규칙이 담당). */
const FIREBASE_API_KEY="AIzaSyDm-arGl87SS48ED0wPBjdE-Ly5V2LPFwc";
/* 로그인 아이디 → Firebase 계정 이메일로 바꿀 때 붙이는 주소 (실제 메일은 보내지 않음) */
const LOGIN_DOMAIN="vitamin2.app";
const ADMIN_LOGIN_ID="admin";
const STEP=10,MATH_DAYS=30,MATH_POINTS=300,MATH_RETRY_POINTS=0,CHECKIN_POINTS=10,MAX_Q=5;
/* 예비고1 수학: 정답 1문제당 포인트 */
const PRE_MATH_POINTS=100;
/* 예비고1 수학: 내 노트(틀렸던 문제)를 맞혀서 정복할 때 포인트 */
const PRE_MATH_REVIEW_POINTS=50;
const CIRCLED=['①','②','③','④','⑤'];
