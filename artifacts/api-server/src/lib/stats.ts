// ═══════════════════════════════════════════════════════════════════════
// Pure-TypeScript statistical library — no external dependencies
// Covers: descriptive, distributions, inference, regression, linear algebra
// ═══════════════════════════════════════════════════════════════════════

// ─── Basic descriptive ───────────────────────────────────────────────────────

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function variance(xs: number[], ddof = 1): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - ddof);
}

export function std(xs: number[], ddof = 1): number {
  return Math.sqrt(variance(xs, ddof));
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function skewness(xs: number[]): number {
  const n = xs.length; if (n < 3) return 0;
  const m = mean(xs), s = std(xs);
  if (s === 0) return 0;
  return (n / ((n - 1) * (n - 2))) * xs.reduce((a, x) => a + ((x - m) / s) ** 3, 0);
}

export function kurtosis(xs: number[]): number {
  const n = xs.length; if (n < 4) return 0;
  const m = mean(xs), s = std(xs);
  if (s === 0) return 0;
  const k4 = xs.reduce((a, x) => a + ((x - m) / s) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * k4 -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

export function covariance(xs: number[], ys: number[], ddof = 1): number {
  const n = Math.min(xs.length, ys.length); if (n < 2) return 0;
  const mx = mean(xs), my = mean(ys);
  return xs.slice(0, n).reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (n - ddof);
}

// ─── Distribution functions ──────────────────────────────────────────────────

/** Normal PDF */
export function normalPDF(x: number, mu = 0, sigma = 1): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Complementary error function approximation (max error < 1.5e-7) */
function erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const res = poly * Math.exp(-x * x);
  return x >= 0 ? res : 2 - res;
}

/** Normal CDF Φ(x) */
export function normalCDF(x: number): number {
  return 0.5 * erfc(-x / Math.SQRT2);
}

/** Inverse normal CDF (rational approximation) */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; const r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/** Poisson PMF P(X = k | λ) — log-space to avoid overflow */
export function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0 || k < 0) return 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/** Binomial PMF P(X = k | n, p) */
export function binomialPMF(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  const logC = logChoose(n, k);
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

function logChoose(n: number, k: number): number {
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

/** Log-Gamma using Stirling / Lanczos */
export function logGamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularised incomplete gamma P(a, x) via series expansion */
function gammaRegP(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  let sum = 1 / a, term = 1 / a;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-12 * Math.abs(sum)) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum;
}

/** Chi-square CDF P(χ² ≤ x, df) */
export function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  return gammaRegP(df / 2, x / 2);
}

/** Chi-square p-value (upper tail) */
export function chiSquarePValue(chi2: number, df: number): number {
  return Math.max(0, 1 - chiSquareCDF(chi2, df));
}

/** Student t p-value (two-tailed) via normal approximation for large df, else series */
export function tPValue(t: number, df: number): number {
  const x = df / (df + t * t);
  // regularised incomplete beta I(x; df/2, 1/2)
  const p = betaRegI(x, df / 2, 0.5);
  return Math.min(1, p);
}

function betaRegI(x: number, a: number, b: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  // Continued fraction
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  return x < (a + 1) / (a + b + 2) ? bt * h / a : 1 - bt * h / b;
}

/** F-distribution p-value (upper tail) */
export function fPValue(f: number, df1: number, df2: number): number {
  const x = df2 / (df2 + df1 * f);
  return Math.min(1, betaRegI(x, df2 / 2, df1 / 2));
}

// ─── Hypothesis tests ────────────────────────────────────────────────────────

export function pearsonCorr(xs: number[], ys: number[]): { r: number; pValue: number; tStat: number; df: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return { r: 0, pValue: 1, tStat: 0, df: 0 };
  const mx = mean(xs), my = mean(ys);
  const sx = xs.slice(0, n), sy = ys.slice(0, n);
  const num = sx.reduce((a, x, i) => a + (x - mx) * (sy[i] - my), 0);
  const d1 = Math.sqrt(sx.reduce((a, x) => a + (x - mx) ** 2, 0));
  const d2 = Math.sqrt(sy.reduce((a, y) => a + (y - my) ** 2, 0));
  const r = d1 * d2 > 0 ? num / (d1 * d2) : 0;
  const df = n - 2;
  const tStat = df > 0 && Math.abs(r) < 1 ? r * Math.sqrt(df) / Math.sqrt(1 - r * r) : 0;
  return { r: parseFloat(r.toFixed(4)), pValue: parseFloat(tPValue(Math.abs(tStat), df).toFixed(4)), tStat: parseFloat(tStat.toFixed(4)), df };
}

export function twoSampleTTest(a: number[], b: number[]): { tStat: number; df: number; pValue: number; mean1: number; mean2: number; meanDiff: number; cohensD: number } {
  const m1 = mean(a), m2 = mean(b);
  const v1 = variance(a), v2 = variance(b);
  const n1 = a.length, n2 = b.length;
  if (n1 < 2 || n2 < 2) return { tStat: 0, df: 0, pValue: 1, mean1: m1, mean2: m2, meanDiff: m1 - m2, cohensD: 0 };
  // Welch's t-test
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const tStat = se > 0 ? (m1 - m2) / se : 0;
  const dfNum = (v1 / n1 + v2 / n2) ** 2;
  const dfDen = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = dfDen > 0 ? dfNum / dfDen : n1 + n2 - 2;
  const pooledSd = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const cohensD = pooledSd > 0 ? (m1 - m2) / pooledSd : 0;
  return { tStat: parseFloat(tStat.toFixed(4)), df: parseFloat(df.toFixed(1)), pValue: parseFloat(tPValue(Math.abs(tStat), df).toFixed(4)), mean1: parseFloat(m1.toFixed(4)), mean2: parseFloat(m2.toFixed(4)), meanDiff: parseFloat((m1 - m2).toFixed(4)), cohensD: parseFloat(cohensD.toFixed(3)) };
}

export function oneWayAnova(groups: number[][], labels: string[]): {
  fStatistic: number; dfBetween: number; dfWithin: number; pValue: number;
  eta2: number; groups: { label: string; n: number; mean: number; std: number }[];
} {
  const k = groups.length;
  const allVals = groups.flat();
  const N = allVals.length;
  const grandMean = mean(allVals);
  const ssBetween = groups.reduce((a, g) => a + g.length * (mean(g) - grandMean) ** 2, 0);
  const ssWithin = groups.reduce((a, g) => a + g.reduce((b, x) => b + (x - mean(g)) ** 2, 0), 0);
  const dfBetween = k - 1, dfWithin = N - k;
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 1;
  const fStat = msWithin > 0 ? msBetween / msWithin : 0;
  const ssTotal = ssBetween + ssWithin;
  return {
    fStatistic: parseFloat(fStat.toFixed(4)),
    dfBetween, dfWithin,
    pValue: parseFloat(fPValue(fStat, dfBetween, dfWithin).toFixed(4)),
    eta2: ssTotal > 0 ? parseFloat((ssBetween / ssTotal).toFixed(4)) : 0,
    groups: groups.map((g, i) => ({ label: labels[i], n: g.length, mean: parseFloat(mean(g).toFixed(4)), std: parseFloat(std(g).toFixed(4)) })),
  };
}

export function chiSquareTest(contingency: number[][], rowLabels: string[], colLabels: string[]): {
  chiSquare: number; df: number; pValue: number; cramersV: number; significant: boolean;
  expected: number[][];
} {
  const r = contingency.length, c = contingency[0].length;
  const rowSums = contingency.map(row => row.reduce((a, b) => a + b, 0));
  const colSums = Array.from({ length: c }, (_, j) => contingency.reduce((a, row) => a + row[j], 0));
  const total = rowSums.reduce((a, b) => a + b, 0);
  if (total === 0) return { chiSquare: 0, df: 0, pValue: 1, cramersV: 0, significant: false, expected: [] };
  const expected = contingency.map((row, i) => row.map((_, j) => (rowSums[i] * colSums[j]) / total));
  const chi2 = contingency.reduce((a, row, i) => a + row.reduce((b, obs, j) => {
    const exp = expected[i][j];
    return exp > 0 ? b + (obs - exp) ** 2 / exp : b;
  }, 0), 0);
  const df = (r - 1) * (c - 1);
  const pValue = chiSquarePValue(chi2, df);
  const cramersV = total > 0 ? Math.sqrt(chi2 / (total * Math.min(r - 1, c - 1))) : 0;
  return {
    chiSquare: parseFloat(chi2.toFixed(4)), df, pValue: parseFloat(pValue.toFixed(4)),
    cramersV: parseFloat(cramersV.toFixed(4)), significant: pValue < 0.05, expected,
  };
}

// ─── Regression ──────────────────────────────────────────────────────────────

export function simpleLinReg(xs: number[], ys: number[]): {
  slope: number; intercept: number; rSquared: number; pearsonR: number;
  seSlope: number; tStat: number; pValue: number; equation: string;
  predicted: number[];
} {
  const n = Math.min(xs.length, ys.length); if (n < 2) return { slope: 0, intercept: mean(ys), rSquared: 0, pearsonR: 0, seSlope: 0, tStat: 0, pValue: 1, equation: "y = 0", predicted: ys };
  const sx = xs.slice(0, n), sy = ys.slice(0, n);
  const mx = mean(sx), my = mean(sy);
  const sxx = sx.reduce((a, x) => a + (x - mx) ** 2, 0);
  const sxy = sx.reduce((a, x, i) => a + (x - mx) * (sy[i] - my), 0);
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const predicted = sx.map(x => slope * x + intercept);
  const ssRes = sy.reduce((a, y, i) => a + (y - predicted[i]) ** 2, 0);
  const ssTot = sy.reduce((a, y) => a + (y - my) ** 2, 0);
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const pearsonR = Math.sign(slope) * Math.sqrt(rSquared);
  const df = n - 2;
  const mse = df > 0 ? ssRes / df : 0;
  const seSlope = sxx > 0 ? Math.sqrt(mse / sxx) : 0;
  const tStat = seSlope > 0 ? slope / seSlope : 0;
  const pValue = tPValue(Math.abs(tStat), df);
  return {
    slope: parseFloat(slope.toFixed(6)), intercept: parseFloat(intercept.toFixed(4)),
    rSquared: parseFloat(rSquared.toFixed(4)), pearsonR: parseFloat(pearsonR.toFixed(4)),
    seSlope: parseFloat(seSlope.toFixed(6)), tStat: parseFloat(tStat.toFixed(4)),
    pValue: parseFloat(pValue.toFixed(4)),
    equation: `y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)}`,
    predicted: predicted.map(p => parseFloat(p.toFixed(4))),
  };
}

/** Multiple linear regression using OLS: β = (X'X)^{-1} X'y */
export function multipleLinReg(Xraw: number[][], y: number[], varNames: string[]): {
  coefficients: { variable: string; coef: number; se: number; tStat: number; pValue: number; significant: boolean }[];
  rSquared: number; adjRSquared: number; fStatistic: number; fPValue: number;
  n: number; k: number; predicted: number[];
} {
  const n = Math.min(Xraw.length, y.length);
  const k = Xraw[0].length;
  if (n < k + 2) return { coefficients: [], rSquared: 0, adjRSquared: 0, fStatistic: 0, fPValue: 1, n, k, predicted: [] };

  // Add intercept column
  const X = Xraw.slice(0, n).map(row => [1, ...row]);
  const ysub = y.slice(0, n);

  // X'X
  const XtX = matMul(matTranspose(X), X);
  const XtXinv = matInverse(XtX);
  if (!XtXinv) return { coefficients: [], rSquared: 0, adjRSquared: 0, fStatistic: 0, fPValue: 1, n, k, predicted: [] };

  // β = (X'X)^{-1} X'y
  const Xty = matMul(matTranspose(X), ysub.map(yv => [yv]));
  const betaMat = matMul(XtXinv, Xty);
  const beta = betaMat.map(r => r[0]);

  const predicted = X.map(row => row.reduce((s, x, j) => s + x * beta[j], 0));
  const my = mean(ysub);
  const ssRes = ysub.reduce((a, yv, i) => a + (yv - predicted[i]) ** 2, 0);
  const ssTot = ysub.reduce((a, yv) => a + (yv - my) ** 2, 0);
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - k - 1);
  const mse = ssRes / (n - k - 1);
  const ssReg = ssTot - ssRes;
  const fStatistic = mse > 0 ? (ssReg / k) / mse : 0;
  const fP = fPValue(fStatistic, k, n - k - 1);

  const diag = XtXinv.map((row, i) => row[i]);
  const allNames = ["(Constante)", ...varNames];
  const coefficients = beta.map((b, i) => {
    const se = Math.sqrt(Math.abs(mse * diag[i]));
    const t = se > 0 ? b / se : 0;
    const p = tPValue(Math.abs(t), n - k - 1);
    return { variable: allNames[i] ?? `x${i}`, coef: parseFloat(b.toFixed(4)), se: parseFloat(se.toFixed(4)), tStat: parseFloat(t.toFixed(4)), pValue: parseFloat(p.toFixed(4)), significant: p < 0.05 };
  });

  return { coefficients, rSquared: parseFloat(rSquared.toFixed(4)), adjRSquared: parseFloat(adjRSquared.toFixed(4)), fStatistic: parseFloat(fStatistic.toFixed(4)), fPValue: parseFloat(fP.toFixed(4)), n, k, predicted: predicted.map(p => parseFloat(p.toFixed(4))) };
}

// ─── Linear algebra ──────────────────────────────────────────────────────────

export function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      Array.from({ length: p }, (_, k) => A[i][k] * B[k][j]).reduce((a, b) => a + b, 0)
    )
  );
}

export function matTranspose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  return Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => A[j][i]));
}

/** Gaussian elimination with partial pivoting. Returns null if singular. */
export function matInverse(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-14) return null;
    const pivot = M[col][col];
    for (let j = col; j < 2 * n; j++) M[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let j = col; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map(row => row.slice(n));
}

/** Covariance matrix of columns of X (n × p matrix) */
export function covMatrix(X: number[][]): number[][] {
  const p = X[0].length;
  const means = Array.from({ length: p }, (_, j) => mean(X.map(row => row[j])));
  const Xc = X.map(row => row.map((x, j) => x - means[j]));
  return Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => covariance(Xc.map(r => r[i]), Xc.map(r => r[j]), 1))
  );
}

/** Power iteration for dominant eigenvalue + vector */
function powerIteration(A: number[][], maxIter = 300): { value: number; vector: number[] } {
  const n = A.length;
  let v = Array.from({ length: n }, () => Math.random() - 0.5);
  let lambda = 0;
  for (let it = 0; it < maxIter; it++) {
    const Av = A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
    lambda = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
    if (lambda < 1e-12) break;
    v = Av.map(x => x / lambda);
  }
  return { value: lambda, vector: v };
}

/** PCA via spectral decomposition — returns top `numPCs` components */
export function pca(data: number[][], varNames: string[], numPCs = 2): {
  components: { pc: number; variance: number; varianceExplained: number; loadings: { variable: string; loading: number }[] }[];
  scores: number[][];
  totalVariance: number;
} {
  if (data.length < 2 || data[0].length < 2) return { components: [], scores: [], totalVariance: 0 };
  const p = data[0].length;
  const means = Array.from({ length: p }, (_, j) => mean(data.map(r => r[j])));
  const stds = Array.from({ length: p }, (_, j) => std(data.map(r => r[j])));
  // Standardise
  const Zraw = data.map(row => row.map((x, j) => stds[j] > 0 ? (x - means[j]) / stds[j] : 0));
  let cov = covMatrix(Zraw);
  const components: { pc: number; variance: number; varianceExplained: number; loadings: { variable: string; loading: number }[] }[] = [];
  let totalVariance = cov.reduce((s, row, i) => s + row[i], 0);
  const origTotal = totalVariance;
  for (let pc = 1; pc <= Math.min(numPCs, p); pc++) {
    const { value, vector } = powerIteration(cov);
    components.push({ pc, variance: parseFloat(value.toFixed(4)), varianceExplained: parseFloat((origTotal > 0 ? (value / origTotal) * 100 : 0).toFixed(1)), loadings: varNames.map((v, j) => ({ variable: v, loading: parseFloat(vector[j].toFixed(4)) })) });
    // Deflation: cov = cov - λ * v * v'
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) cov[i][j] -= value * vector[i] * vector[j];
    totalVariance -= value;
  }
  // Scores: Z @ eigenvectors
  const eigVecs = components.map(c => c.loadings.map(l => l.loading));
  const scores = Zraw.map(row => eigVecs.map(ev => row.reduce((s, x, j) => s + x * ev[j], 0)));
  return { components, scores: scores.map(s => s.map(v => parseFloat(v.toFixed(4)))), totalVariance: origTotal };
}

// ─── Time series ─────────────────────────────────────────────────────────────

export function movingAverage(data: number[], window: number): (number | null)[] {
  const half = Math.floor(window / 2);
  return data.map((_, i) => {
    const start = i - half, end = start + window;
    if (start < 0 || end > data.length) return null;
    return mean(data.slice(start, end));
  });
}

/** Simple STL-like decomposition (additive, fixed period) */
export function timeSeriesDecompose(data: { month: string; value: number }[], period = 12): {
  points: { month: string; observed: number; trend: number | null; seasonal: number; residual: number | null }[];
  trendSlope: number; seasonalStrength: number; residualStd: number;
} {
  const vals = data.map(d => d.value);
  const n = vals.length;
  const trend = movingAverage(vals, period);

  // Seasonal indices
  const detrended = vals.map((v, i) => trend[i] !== null ? v - trend[i]! : null);
  const byPeriod: number[][] = Array.from({ length: period }, () => []);
  detrended.forEach((v, i) => { if (v !== null) byPeriod[i % period].push(v); });
  const seasonal = vals.map((_, i) => {
    const g = byPeriod[i % period];
    return g.length > 0 ? mean(g) : 0;
  });

  // Residual
  const points = data.map((d, i) => ({
    month: d.month,
    observed: d.value,
    trend: trend[i] !== null ? parseFloat(trend[i]!.toFixed(2)) : null,
    seasonal: parseFloat(seasonal[i].toFixed(2)),
    residual: trend[i] !== null ? parseFloat((d.value - trend[i]! - seasonal[i]).toFixed(2)) : null,
  }));

  // Trend slope (linear regression on non-null trend values)
  const trendPairs = points.filter(p => p.trend !== null).map((p, i) => ({ x: i, y: p.trend! }));
  const trendReg = simpleLinReg(trendPairs.map(p => p.x), trendPairs.map(p => p.y));

  // Seasonal strength: Var(seasonal) / (Var(seasonal) + Var(residual))
  const residuals = points.filter(p => p.residual !== null).map(p => p.residual!);
  const varSeas = variance(seasonal, 0);
  const varResid = residuals.length > 1 ? variance(residuals) : 0;
  const seasonalStrength = varSeas + varResid > 0 ? varSeas / (varSeas + varResid) : 0;

  return {
    points,
    trendSlope: parseFloat(trendReg.slope.toFixed(4)),
    seasonalStrength: parseFloat(seasonalStrength.toFixed(4)),
    residualStd: parseFloat(std(residuals).toFixed(4)),
  };
}

// ─── Bayesian update (conjugate normal-normal) ────────────────────────────────

export function bayesianNormalUpdate(
  priorMean: number, priorVar: number,
  observations: number[], obsVar: number
): { mean: number; variance: number; std: number; lower95: number; upper95: number } {
  if (observations.length === 0) {
    const s = Math.sqrt(priorVar);
    return { mean: priorMean, variance: priorVar, std: s, lower95: priorMean - 1.96 * s, upper95: priorMean + 1.96 * s };
  }
  const n = observations.length;
  const obsPrec = n / obsVar;
  const priorPrec = 1 / priorVar;
  const postVar = 1 / (priorPrec + obsPrec);
  const obsMean = mean(observations);
  const postMean = postVar * (priorPrec * priorMean + obsPrec * obsMean);
  const postStd = Math.sqrt(postVar);
  return {
    mean: parseFloat(postMean.toFixed(4)),
    variance: parseFloat(postVar.toFixed(6)),
    std: parseFloat(postStd.toFixed(4)),
    lower95: parseFloat((postMean - 1.96 * postStd).toFixed(4)),
    upper95: parseFloat((postMean + 1.96 * postStd).toFixed(4)),
  };
}

/** Sequential Bayesian updates — one per observation */
export function bayesianSequentialUpdates(
  priorMean: number, priorVar: number, obsVarEstimate: number,
  observations: { month: string; value: number }[]
): { month: string; posterior_mean: number; lower95: number; upper95: number }[] {
  let pm = priorMean, pv = priorVar;
  return observations.map(obs => {
    const { mean: nm, variance: nv, lower95, upper95 } = bayesianNormalUpdate(pm, pv, [obs.value], obsVarEstimate);
    pm = nm; pv = nv;
    return { month: obs.month, posterior_mean: nm, lower95, upper95 };
  });
}

// ─── Distribution fitting ────────────────────────────────────────────────────

export function fitNormal(xs: number[]): { mu: number; sigma: number; logLikelihood: number } {
  const mu = mean(xs), sigma = std(xs, 0);
  const ll = xs.reduce((a, x) => a + Math.log(normalPDF(x, mu, Math.max(sigma, 1e-9))), 0);
  return { mu: parseFloat(mu.toFixed(4)), sigma: parseFloat(sigma.toFixed(4)), logLikelihood: parseFloat(ll.toFixed(3)) };
}

export function fitPoisson(xs: number[]): { lambda: number; logLikelihood: number } {
  const lambda = mean(xs);
  const ll = xs.reduce((a, x) => a + Math.log(Math.max(poissonPMF(Math.round(x), lambda), 1e-300)), 0);
  return { lambda: parseFloat(lambda.toFixed(4)), logLikelihood: parseFloat(ll.toFixed(3)) };
}

export function histogramBins(xs: number[], numBins = 10): { binStart: number; binEnd: number; count: number; density: number }[] {
  if (!xs.length) return [];
  const lo = Math.min(...xs), hi = Math.max(...xs);
  const w = hi > lo ? (hi - lo) / numBins : 1;
  const bins = Array.from({ length: numBins }, (_, i) => ({ binStart: lo + i * w, binEnd: lo + (i + 1) * w, count: 0, density: 0 }));
  xs.forEach(x => {
    const idx = Math.min(Math.floor((x - lo) / w), numBins - 1);
    bins[idx].count++;
  });
  const total = xs.length * w;
  bins.forEach(b => { b.density = parseFloat((total > 0 ? b.count / total : 0).toFixed(6)); });
  return bins;
}
