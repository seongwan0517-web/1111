VITAMIN v2.1 파일 구조  (index.html 을 열면 실행됩니다. 폴더째로 보관하세요)

index.html            화면 뼈대(HTML)
css/style.css         디자인(색, 크기, 모양)
js/config.js          Firebase 주소, 호가 단위(STEP), 수학 포인트 등 설정값
js/vocab-data.js      영어 단어 데이터 Day1~30  → 단어만 고칠 때 이 파일만
js/core.js            공통 기능(데이터 읽기/저장 등)  ※ 웬만하면 수정 X
js/auth.js            로그인
js/student-home.js    학생 홈 대시보드, 공지, 상점, 내역
js/auction.js         경매(학생 입찰 화면, 관리자 관리, 일괄 종료)
js/seat.js            자리표
js/vocab.js           단어시험
js/math.js            수학시험
js/poll.js            자동 새로고침
js/admin.js           관리자(학생/포인트/상점/주문/공지)

수정 후 브라우저가 옛날 파일을 보여주면 Ctrl+F5.
