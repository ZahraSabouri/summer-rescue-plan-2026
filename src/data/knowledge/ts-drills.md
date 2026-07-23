@@ id=ts-r-code-drill | title=Every R question on one page | kind=cheatsheet | topic=TS · Drills | key | tags=exam,recall,code,R | cards=card-077
**Three R parts per answered paper, usually ~10 marks, recur around five core templates.** This is among the highest marks-per-hour revision in the module.

| Asked as | Template |
| --- | --- |
| Simulate a **Gaussian process** at given points | `chol` recipe |
| Simulate an **ARMA** realization | `for` loop over the difference equation |
| Compute an **$h$-step forecast** with CI | `solve(Sigma, b)` BLUP |
| Compute a **correlogram** | double loop over lags |
| Compute a **periodogram** (with or without FFT) | cosine sum, or `fft` |

**The five recurring traps, all mechanical:**

1. **`rnorm(n, mean, sd)` takes the standard deviation.** Given $\sigma^2 = 1.7$, write `sqrt(1.7)`.
2. **Rearranging the ARMA equation flips the AR signs.** $x_t - 0.7x_{t-1} = \dots$ becomes `x[t] = 0.7*x[t-1] + ...`.
3. **`t(chol(S))`**, not `chol(S)` — R returns the upper factor.
4. **Loop bounds start at $p+1$** so all lags exist; the initial values given always number $p$.
5. **Index offset in the correlogram:** `covg[1]` is $\hat R(0)$.

**A safe skeleton when you are unsure:** declare the parameters, build the noise with `rnorm`, preallocate with `rep(0, n)`, set the initial values, loop, then `plot`. Even a partially correct loop earns most of the marks — an empty answer earns none, and these are only 3 marks each.

## Check yourself
1. Given $\sigma^2 = 9$, what do you pass as the third argument of `rnorm`? :: 3, the standard deviation.
2. Why `t(chol(S))`? :: `chol` returns the upper-triangular factor; the simulation needs the lower-triangular one.
3. Which R call solves the BLUP system? :: `solve(Sigma, b)`.

@@ id=ts-proof-drill | title=Every proof on one page | kind=cheatsheet | topic=TS · Drills | key | tags=exam,recall,proof | cards=card-074
The (ii) slot is a derivation, worth 3–5 marks. These are the ones the papers have asked.

| Proof | The idea in one line |
| --- | --- |
| **$\rho$ is positive semidefinite** | It is $\text{Var}(\sum c_ix_{t_i}) \geq 0$, divided by $R(0)$. |
| **Strict + finite 2nd moment ⟹ WSS** | Shift-invariance of the densities; take $s = -t_2$ so $R$ depends on $t_1-t_2$. |
| **$R(0)=\text{Var}$, $\|R(t)\|\leq R(0)$, $R(-t)=R(t)$** | Definition, Cauchy–Schwarz, symmetry of covariance. |
| **Wiener covariance $=\min(t,s)$** | Split $W_s = W_t + (W_s-W_t)$; the cross term vanishes by independent increments. |
| **Random-walk covariance $=\min(t,s)\sigma^2$** | Expand the double sum; cross-covariances vanish by independence. |
| **BLUP derivation** | Expand $E(\hat x - x)^2$, differentiate in each $a_j$, get $\lambda = \Sigma^{-1}b$. |
| **$n\text{Var}(\bar X_n) \rightarrow 2\pi f(0)$** | Lag $k$ occurs $n-\|k\|$ times; the weights $\rightarrow 1$; $\sum_k R(k) = 2\pi f(0)$. |
| **Causality of AR(2) in terms of coefficients** | Roots of $1-a_1z-a_2z^2$ outside the unit circle ⟺ $a_1+a_2<1$, $a_2-a_1<1$, $\|a_2\|<1$. |
| **$h$-step forecast of a causal ARMA** | Project onto the past; future noise has zero mean, so $MSE = \sigma^2\sum_{i<h}c_i^2$. |

**The AR(2) causality triangle** is worth memorising outright, since "state and prove the condition of causality of the AR(2) process in terms of coefficients" is the mock's Q2(ii) [4 marks]:

$$a_1 + a_2 < 1, \qquad a_2 - a_1 < 1, \qquad |a_2| < 1$$

These three inequalities describe a triangle in the $(a_1,a_2)$ plane, and they are exactly the condition that both roots of $a(z)$ lie outside the unit circle.

## Check yourself
1. State the AR(2) causality conditions. :: $a_1+a_2<1$, $a_2-a_1<1$, and $|a_2|<1$.
2. What is the one-line proof that $\rho$ is positive semidefinite? :: It equals the variance of a linear combination of the process, divided by $R(0)$, and variances are non-negative.
3. What is the key counting step in the $2\pi f(0)$ proof? :: Each lag $k$ appears $n-|k|$ times in the double sum.

@@ id=ts-calculation-drill | title=Every calculation on one page | kind=cheatsheet | topic=TS · Drills | key | tags=exam,recall,calculation | cards=card-048
| Calculation | Method | The trap |
| --- | --- | --- |
| **Causal? Invertible?** | roots of $a(z)$ / $b(z)$ vs unit circle | causal uses $a$, invertible uses $b$; roots must be **outside** |
| **MA coefficients $c_0..c_4$** | $c_0=1$, $c_j = \sum_i a_ic_{j-i}$ | works only if causal; check $c_1 = a_1$ |
| **Short/long-range** | multiply the exponents; converges iff $\alpha>1$ | both worked examples sit near the boundary |
| **Non-stationary $c$ values** | factor $a(z)$, set $\|root\|=1$ | non-stationary = root **on** the circle, not inside |
| **Spectral density → $R(k)$** | $\int_{-\pi}^{\pi}\cos(k\lambda)f(\lambda)d\lambda$ | use the cosine orthogonality relations |
| **BLUP from a short series** | $\lambda = \Sigma^{-1}b$, $\sigma^2 = R(0)-b^T\Sigma^{-1}b$ | order $b$ from furthest lag to nearest |
| **AR forecast + bounds** | recurse, substituting forecasts | **centre by $\mu$ first**; $MSE = \sigma^2\sum_{i<h}c_i^2$ |
| **Yule–Walker** | $\rho(k)$ obeys the process recursion | $\hat C$ uses **correlations**, not covariances |
| **MA(1) estimation** | solve $b/(1+b^2) = \hat\rho(1)$ | pick the root with $\|b\|<1$ and say why |
| **Estimate $\hat R(k)$** | centre, multiply at lag $k$, divide by $n$ | divisor is always $n$, never $n-k$ |
| **Filtering** | keep deltas inside the interval | amplitudes enter the spectrum **squared** |
| **Mean of ARMA with constant** | $\mu = \delta/a(1)$ | only for the constant form, not the centred form |

**The habit that protects most of these marks: write down what is given before computing.** Every one of these questions is short once the parameters, lags and $\sigma^2$ are laid out explicitly, and almost every lost mark comes from a sign or a mis-read lag.

@@ id=ts-definitions-drill | title=Every definition the (i) slot has asked | kind=cheatsheet | topic=TS · Drills | key | tags=exam,recall,definition | cards=card-048
Slot (i) is 2 marks for a definition or theorem statement, on every question of every paper. That is **6 marks per paper for pure recall.**

| Asked | Where |
| --- | --- |
| Mercer expansion **and** Karhunen–Loève expansion | mock Q1, 2020 Q2 |
| Bochner–Khinchin theorem, continuous **and** discrete | 2020 Q1 |
| $n$-order stationary process **and** the Wiener process | mock Q3 |
| ARMA(p,q) with zero mean **and** with mean $\mu$ | mock Q2 |
| Invertible ARMA(p,q) | 2020 Q3 |
| Brownian motion, plus derive its mean and covariance | 2020 Q1 |

**Note the pattern: the slot almost always asks for TWO things.** "State the Mercer expansion **and** the Karhunen–Loève expansion." "The definition of the $n$-order stationary process **and** the definition of the Wiener process." Answering one of the two caps you at half the marks — read the *and*.

**Also examinable at this level:** white noise, random walk, Brownian bridge, Poisson process, causality, the backward shift operator, the spectral density, short/long-range dependence, the correlogram.

## Check yourself
1. How many marks per paper come from the (i) definition slots? :: Six — 2 marks on each of three questions.
2. What structural feature do these questions almost always share? :: They ask for two definitions or theorems, joined by "and".
3. Name the two expansions that recur most often. :: Mercer (of the covariance function) and Karhunen–Loève (of the process).

@@ id=ts-exam-strategy | title=Working the paper | kind=qa | topic=TS · Drills | key | tags=exam,strategy | cards=card-048
2 hours, answer three questions, 75 marks — **40 minutes and 25 marks per answered question**, and each supplied question has seven parts. The 2026 mock contains exactly three questions; the 2015–2020 papers contain four and ask you to choose three.

**A workable order.**

1. **Scan all questions first** and mark the (i) definition slots. They are 2 marks each for pure recall — bank six marks in the first five minutes.
2. **Then the (iv) identification slots** — causal? invertible? short- or long-range? Each is 2–3 marks and under two minutes if you know the root test.
3. **Then the R code (iii).** Usually 3–4 marks for a recurring template. Do not leave these to the end; they are among the most mechanical marks on the paper.
4. **Then the calculations (v)–(vii).** These are the 4–6 mark items and take the most time.
5. **Leave the derivation (ii) until last** if you are unsure of it. Partial credit is real — state what you are proving and set up the first line even if you cannot finish.

**"Show all your working clearly"** is printed in the rubric. On a 5-mark calculation the method carries most of the marks, so an arithmetic slip with visible correct method still scores well; a bare wrong number scores nothing.

**Three habits worth the marks:**

* **Centre by $\mu$ before recursing** in any forecasting question.
* **Keep $z_{1-\alpha/2}$ symbolic** unless a numeric confidence level is given.
* **Say why you rejected a root** in MA(1) estimation or a causality check — it is often an explicit mark.

## Check yourself
1. How long per question, and how many parts? :: About 40 minutes for 25 marks across seven parts.
2. Which slots should you do first and why? :: The (i) definitions and (iv) identifications — high marks per minute and pure recall.
3. Why does showing working matter so much here? :: The rubric demands it, and on multi-mark calculations the method carries most of the credit even if the arithmetic slips.

@@ id=ts-ssa | title=Singular Spectrum Analysis | kind=concept | topic=TS · L15 SSA | tags=definition | cards=card-044
Lecture 15 introduces **SSA** as a **model-free** methodology — it does not assume an ARMA structure or stationarity.

The four stages of basic SSA:

1. **Embedding** — choose $L$ with $2\leq L<n-L+1$ and build the $L\times(n-L+1)$ Hankel trajectory matrix from lagged windows.
2. **Singular value decomposition** — write
   $$X=\sum_i\sqrt{\lambda_i}U_iV_i^T,$$
   where $(\lambda_i,U_i,V_i)$ is an eigentriple.
3. **Grouping** — combine eigentriples representing trend, oscillations/seasonality, and noise.
4. **Diagonal averaging (Hankelisation/reconstruction)** — average matrix anti-diagonals to turn each grouped matrix back into a time series.

The output is a decomposition of the original series into **trend + oscillatory components + noise**, obtained without fitting a parametric model. Lecture 15 also distinguishes **recurrent** and **vector** SSA forecasting; for first-pass revision, know that both extend the reconstructed signal subspace, while the full formulas are lower priority than the embedding/SVD/reconstruction skeleton.

**Note on coverage.** SSA sits at the very end of the module and does **not appear in the mock exam or in the 2019/2020 papers I have extracted**. Treat it as lower priority than Lectures 3–13 unless your lecturer has flagged it — but be able to say what the four stages are.

**Source:** `Learning Materials/ma3508_lecture15.pdf`, pp.2–11, 26–36.

## Check yourself
1. What does "model-free" mean for SSA? :: It does not assume a parametric model such as ARMA, nor stationarity.
2. Name the four stages. :: Embedding, singular value decomposition, grouping, and diagonal averaging (reconstruction).
3. What shape is the trajectory matrix? :: $L\times(n-L+1)$, with lagged windows as columns.
