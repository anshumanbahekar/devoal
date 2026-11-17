// Independent reference implementations check that every authored example has the stated answer.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const problems = JSON.parse(readFileSync(new URL('../content/challenges/interview-core.json', import.meta.url), 'utf8'));
const solutions = {
  'contains-duplicate': nums => new Set(nums).size !== nums.length,
  'best-stock-trade': prices => { let low = Infinity, best = 0; for (const price of prices) { best = Math.max(best, price - low); low = Math.min(low, price); } return best; },
  'product-except-index': nums => { const out = Array(nums.length).fill(1); let product = 1; for (let i = 0; i < nums.length; i++) { out[i] = product; product *= nums[i]; } product = 1; for (let i = nums.length - 1; i >= 0; i--) { out[i] *= product; product *= nums[i]; } return out; },
  'subarray-target-count': (nums, target) => { const counts = new Map([[0, 1]]); let prefix = 0, answer = 0; for (const n of nums) { prefix += n; answer += counts.get(prefix - target) || 0; counts.set(prefix, (counts.get(prefix) || 0) + 1); } return answer; },
  'anagram-check': (a, b) => { if (a.length !== b.length) return false; const counts = new Map(); for (const c of a) counts.set(c, (counts.get(c) || 0) + 1); for (const c of b) counts.set(c, (counts.get(c) || 0) - 1); return [...counts.values()].every(n => n === 0); },
  'longest-distinct-span': s => { const last = new Map(); let left = 0, best = 0; for (let right = 0; right < s.length; right++) { left = Math.max(left, (last.get(s[right]) ?? -1) + 1); last.set(s[right], right); best = Math.max(best, right - left + 1); } return best; },
  'merge-overlapping-intervals': intervals => { const sorted = intervals.map(pair => [...pair]).sort((a, b) => a[0] - b[0]); const out = []; for (const pair of sorted) { const last = out.at(-1); if (last && pair[0] <= last[1]) last[1] = Math.max(last[1], pair[1]); else out.push(pair); } return out; },
  'spiral-matrix': matrix => { if (!matrix.length) return []; const out = []; let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1; while (top <= bottom && left <= right) { for (let c = left; c <= right; c++) out.push(matrix[top][c]); top++; for (let r = top; r <= bottom; r++) out.push(matrix[r][right]); right--; if (top <= bottom) { for (let c = right; c >= left; c--) out.push(matrix[bottom][c]); bottom--; } if (left <= right) { for (let r = bottom; r >= top; r--) out.push(matrix[r][left]); left++; } } return out; },
  'sorted-pair-sum': (nums, target) => { let left = 0, right = nums.length - 1; while (left < right) { const sum = nums[left] + nums[right]; if (sum === target) return [left, right]; if (sum < target) left++; else right--; } return [-1, -1]; },
  'widest-container': heights => { let left = 0, right = heights.length - 1, best = 0; while (left < right) { best = Math.max(best, Math.min(heights[left], heights[right]) * (right - left)); if (heights[left] <= heights[right]) left++; else right--; } return best; },
  'longest-one-run': (nums, k) => { let left = 0, zeros = 0, best = 0; for (let right = 0; right < nums.length; right++) { if (!nums[right]) zeros++; while (zeros > k) if (!nums[left++]) zeros--; best = Math.max(best, right - left + 1); } return best; },
  'staircase-count': n => { let previous = 1, current = 1; for (let step = 2; step <= n; step++) [previous, current] = [current, previous + current]; return current; },
  'minimum-coins': (coins, amount) => { const best = Array(amount + 1).fill(Infinity); best[0] = 0; for (let value = 1; value <= amount; value++) for (const coin of coins) if (coin <= value) best[value] = Math.min(best[value], best[value - coin] + 1); return Number.isFinite(best[amount]) ? best[amount] : -1; },
  'nonadjacent-loot': values => { let older = 0, previous = 0; for (const value of values) [older, previous] = [previous, Math.max(previous, older + value)]; return previous; },
  'balanced-brackets': s => { const pairs = { ')': '(', ']': '[', '}': '{' }, stack = []; for (const c of s) { if ('([{'.includes(c)) stack.push(c); else if (stack.pop() !== pairs[c]) return false; } return stack.length === 0; },
  'warmer-day-wait': temperatures => { const out = Array(temperatures.length).fill(0), stack = []; for (let day = 0; day < temperatures.length; day++) { while (stack.length && temperatures[stack.at(-1)] < temperatures[day]) { const old = stack.pop(); out[old] = day - old; } stack.push(day); } return out; },
  'sorted-insert-position': (nums, target) => { let left = 0, right = nums.length; while (left < right) { const middle = (left + right) >> 1; if (nums[middle] < target) left = middle + 1; else right = middle; } return left; },
  'rotated-array-search': (nums, target) => { let left = 0, right = nums.length - 1; while (left <= right) { const middle = (left + right) >> 1; if (nums[middle] === target) return middle; if (nums[left] <= nums[middle]) { if (nums[left] <= target && target < nums[middle]) right = middle - 1; else left = middle + 1; } else if (nums[middle] < target && target <= nums[right]) left = middle + 1; else right = middle - 1; } return -1; },
  'island-count': grid => { const seen = new Set(), rows = grid.length, cols = grid[0]?.length || 0; let count = 0; const visit = (r, c) => { if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== '1' || seen.has(`${r},${c}`)) return; seen.add(`${r},${c}`); visit(r + 1, c); visit(r - 1, c); visit(r, c + 1); visit(r, c - 1); }; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === '1' && !seen.has(`${r},${c}`)) { count++; visit(r, c); } return count; },
  'course-order-possible': (n, prerequisites) => { const indegree = Array(n).fill(0), edges = Array.from({ length: n }, () => []); for (const [course, before] of prerequisites) { indegree[course]++; edges[before].push(course); } const queue = []; for (let i = 0; i < n; i++) if (!indegree[i]) queue.push(i); let visited = 0; for (let head = 0; head < queue.length; head++) { visited++; for (const next of edges[queue[head]]) if (!--indegree[next]) queue.push(next); } return visited === n; },
};

assert.deepEqual(new Set(Object.keys(solutions)), new Set(problems.map(problem => problem.id)));
let cases = 0;
for (const problem of problems) for (const test of problem.tests) {
  const actual = solutions[problem.id](...structuredClone(test.args));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), test.expected, `${problem.id} case ${cases}`);
  cases++;
}
console.log(`${problems.length} reference solutions passed ${cases} authored cases`);
