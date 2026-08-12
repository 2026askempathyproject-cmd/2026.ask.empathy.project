/**
 * 요청 줄 세우기 (서버 전용)
 *
 * 무료 API의 병목은 토큰이 아니라 '분당 요청 수'입니다.
 * 동시에 몰린 요청을 거절(429)하는 대신 일정 간격으로 순서대로 처리하면,
 * 매번 새로 생성하면서도 한도에 걸리지 않습니다.
 *
 * 예) 간격 4.5초 → 분당 약 13건 처리 (무료 한도 10~15건 안쪽)
 *     30명이 동시에 눌러도 마지막 사람이 약 2분 뒤 결과를 받습니다. 실패는 없습니다.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastStart = 0;
let waiting = 0;
let chain = Promise.resolve();

/** 현재 대기 중인 요청 수 */
export const queueLength = () => waiting;

/**
 * @param {number} minInterval 호출 사이 최소 간격(ms)
 * @param {() => Promise<any>} fn 실제 작업
 * @param {(info:{position:number, etaMs:number}) => void} [onQueued] 대기 발생 시 1회 호출
 */
export function paced(minInterval, fn, onQueued) {
  waiting++;
  const position = waiting;

  const wait = Math.max(0, lastStart + minInterval * (position - 1) - Date.now());
  if (wait > 0) onQueued?.({ position, etaMs: wait });

  const run = chain.then(async () => {
    const delay = Math.max(0, lastStart + minInterval - Date.now());
    if (delay > 0) await sleep(delay);
    lastStart = Date.now();
    try {
      return await fn();
    } finally {
      waiting--;
    }
  });

  // 앞 요청이 실패해도 줄은 계속 진행
  chain = run.then(
    () => {},
    () => {}
  );
  return run;
}
