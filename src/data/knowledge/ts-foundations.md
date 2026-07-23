@@ id=ts-exam-shape | title=The exam is a template — learn the seven slots | kind=cheatsheet | topic=TS · Exam shape | key | tags=exam,strategy,logistics | cards=card-048
| | |
| --- | --- |
| Format | **Written paper, 2 hours** |
| Current mock | **THREE questions; answer all three**, each on a separate page |
| Older 2015–2020 papers | **FOUR questions; answer any three** |
| Marks | **75 total**, 25 per question |
| Listed permitted materials | **calculator** and a stamped translation dictionary; no note sheet is listed |
| Instruction | **"Show all your working clearly"** |

**The single most valuable observation: every supplied question has seven slots.** The 2026 mock and every 2015–2020 paper run each question from (i) to (vii):

| Slot | What it asks | Marks |
| --- | --- | --- |
| **(i)** | **State a definition or theorem** — Mercer/Karhunen–Loève, Bochner–Khinchin, Wiener process, ARMA/invertibility definitions | 2 |
| **(ii)** | **Derive or prove** — positive semidefiniteness, causality of AR(2), BLUP derivation, $n\text{Var}(\bar{X}_n) \rightarrow 2\pi f(0)$ | 3–5 |
| **(iii)** | **Write R code** — simulate a Gaussian process / ARMA, compute a forecast with CI, compute a periodogram | 3–4 |
| **(iv)** | **Identify a property** — causal? invertible? short- or long-range dependent? | 2–3 |
| **(v)** | **Compute** — MA representation coefficients $c_0 \dots c_4$, or best linear predictor with bounds | 5–6 |
| **(vi)** | **Forecast or estimate from data** — AR forecasts with MSE and CI, or MA(1)/AR(2) parameter estimation | 4–5 |
| **(vii)** | **Spectral density ↔ covariance**, or find $c$ making a process (non-)stationary, or Yule–Walker | 4–5 |

**What this means for revision.** Prepare seven repeatable procedures, but still read the wording of each part. Three of the twenty-one answered parts are normally **R code** — roughly 10 marks — which makes the code templates unusually efficient revision.

**Sources:** `Some solutions/ma3508_mock_exam.pdf`, p.1; `Past Exams Papers/ma0367_2015_exam-.pdf` to `ma0367_2020_exam_.pdf`, p.1 and question pages.

## Check yourself
1. How many questions do you answer, and what is each worth? :: Three, 25 marks each, 75 total.
2. Roughly how many marks on a full paper come from writing R code? :: About 10 — one R part per question, worth 3–4 marks each.
3. What permitted materials are listed on the supplied mock? :: A calculator and a stamped translation dictionary; no note sheet is listed.

@@ id=ts-formula-sheet | title=The formula sheet to reconstruct from memory | kind=cheatsheet | topic=TS · Exam shape | key | tags=exam,recall,formula | cards=card-048
Closed book, so this is what has to be in your head. Write it out cold before each mock.

**Stationarity and moments**

* $m(t) = Ex_t$; $\sigma^2(t) = \text{Var}(x_t)$; $R(t,s) = E[(x_t-m(t))(x_s-m(s))] = E[x_tx_s] - m(t)m(s)$
* $\rho(t,s) = R(t,s)/\sqrt{\sigma^2(t)\sigma^2(s)}$
* WSS: $Ex_t = m_0$ constant and $R(t,s) = R(t-s)$
* $R(0) = \text{Var}(x_t)$, $\rho(0)=1$, $|R(t)| \leq R(0)$, $R(-t)=R(t)$

**Named processes**

| Process | Mean | Covariance |
| --- | --- | --- |
| Random walk | 0 | $R(t,s) = \min(t,s)\sigma^2$ |
| Wiener $W_t$ | 0 | $R(t,s) = \min(t,s)$ |
| Brownian bridge | 0 | $R(t,s) = \min(t,s) - ts$ |

**Spectral**

* $R(k) = \int_{-\pi}^{\pi}\cos(k\lambda)f(\lambda)d\lambda$ (discrete); $f(\lambda) = \dfrac{1}{2\pi}\sum_k R(k)\cos(k\lambda)$
* ARMA: $f_x(\lambda) = \dfrac{\sigma^2}{2\pi}\dfrac{|b(e^{-i\lambda})|^2}{|a(e^{-i\lambda})|^2}$
* Lecture criterion: short-range if $\sum_{k=1}^{\infty}R(k)$ converges; long-range if it diverges. For the supplied positive power-law examples, reduce to a $p$-series.

**ARMA**

* $a(z) = 1 - a_1z - \dots - a_pz^p$; $b(z) = 1 + b_1z + \dots + b_qz^q$
* **Causal** ⟺ $a(z) \neq 0$ for $|z| \leq 1$; **invertible** ⟺ $b(z) \neq 0$ for $|z| \leq 1$
* Stationary solution exists ⟺ no roots **on** $|z|=1$
* $R(k) = \sigma^2\sum_{s\geq 0} c_s c_{s+|k|}$ from the MA form

**Forecasting**

* $\hat{x}_{n+h} = \mu + \mathbf{\lambda}_h^T Y$, $\mathbf{\lambda}_h = \Sigma^{-1}b_h$, $\sigma^2_{n+h} = R(0) - b_h^T\Sigma^{-1}b_h$
* AR(1): $\hat{x}_{n+h} = \mu + a^h(x_n-\mu)$, $MSE = \sigma^2\dfrac{1-a^{2h}}{1-a^2}$
* General causal ARMA: $MSE(\hat{x}_{n+h}) = \sigma^2\sum_{i=0}^{h-1}c_i^2$
* Bound: $\hat{x}_{n+h} \pm z_{1-\alpha/2}\sqrt{MSE}$

**Estimation**

* $\hat{R}(k) = \dfrac{1}{n}\sum_{j=1}^{n-k}(x_j - \bar{X}_n)(x_{j+k} - \bar{X}_n)$; $\hat{\rho}(k) = \hat{R}(k)/\hat{R}(0)$
* Yule–Walker: $\hat{a} = \hat{C}^{-1}\hat{v}$; $\hat{\sigma}^2 = \hat{R}(0)(1 - \hat{a}_1\hat{\rho}(1) - \dots - \hat{a}_p\hat{\rho}(p))$
* $n\text{Var}(\bar{X}_n) \rightarrow 2\pi f(0)$

**Integrated and applied models**

* ARIMA$(p,d,q)$: $a(B)(1-B)^d x_t=b(B)\varepsilon_t$
* SARIMA$(p,d,q)(P,D,Q)_s$: difference first with $(1-B)^d(1-B^s)^D$, then fit the non-seasonal and seasonal ARMA polynomials
* Real-data order: plot → transform if needed → inspect ACF/PACF and periodogram → fit candidates → prefer a defensible parsimonious model with smaller reported AIC

**Sources:** `Complete lecture notes/ma3508_lecture3.pdf`, pp.11–18; Lectures 5–13 at the matching theorem/example pages; `Learning Materials/ma3508_lecture14.pdf`, pp.2–24.

@@ id=ts-continuous-discrete | title=Continuous vs discrete, deterministic vs stochastic | kind=concept | topic=TS · L3 Processes | tags=definition,exam | cards=card-009
Four definitions the paper can ask for directly.

* A time series is **continuous** when observations are made **continuously in time**.
* A time series is **discrete** when observations are taken **only at specific times, usually equally spaced**.
* A time series is **deterministic** if it can be **predicted exactly**.
* A time series is **stochastic** if future values are **only partly determined by past values**, so exact predictions are impossible.

**The defining contrast with ordinary statistics**, worth stating in any opening answer:

> In statistics, observations are usually **independent** — for a sample $(x_1,\dots,x_N)$ we suppose $x_i$ and $x_j$ are independent for $i \neq j$. In contrast, observations of a time series at different time points are typically **dependent**.

That dependence is the entire subject: it is what makes $R(k)$ meaningful and what makes forecasting possible at all.

## Check yourself
1. What distinguishes a stochastic time series from a deterministic one? :: A deterministic series can be predicted exactly; a stochastic one has future values only partly determined by the past.
2. State the key difference between a time series and an ordinary statistical sample. :: Sample observations are assumed independent; time-series observations at different times are typically dependent.

@@ id=ts-stochastic-process | title=Definition of a stochastic process | kind=concept | topic=TS · L3 Processes | key | tags=definition,exam,core | cards=card-009
> A **stochastic process** is a family of time-indexed random variables $x_t(\omega)$, where $\omega$ belongs to a sample space $(\Omega, P)$ and $t \in T$. The set $T$ is a discrete or continuous subset of $(-\infty,\infty)$.

The two readings of the same object — both examinable:

* **For fixed $t$**, $x_t(\omega)$ as a function of $\omega$ is a **random variable**.
* **For fixed $\omega$**, $x_t(\omega)$ as a function of $t$ is called a **sample function** or **realization**.

> **A time series is a realization of a particular stochastic process.**

**Full description.** A stochastic process is fully defined by its **$n$-dimensional cumulative distribution functions**

$$F_{t_1,\dots,t_n}(u_1,\dots,u_n) := P(\omega : x_{t_1}(\omega) \leq u_1, \dots, x_{t_n}(\omega) \leq u_n)$$

for **all** $n \in \mathbb{N}$ and all $t_1,\dots,t_n \in T$.

## Check yourself
1. Define a stochastic process. :: A family of time-indexed random variables $x_t(\omega)$ with $\omega$ in a sample space and $t$ in an index set.
2. What is a realization? :: The function of $t$ obtained by fixing $\omega$ — that is, a single observed time series.
3. What fully specifies a stochastic process? :: Its $n$-dimensional cumulative distribution functions for all $n$ and all choices of time points.

@@ id=ts-strict-stationarity | title=n-order and strict stationarity | kind=concept | topic=TS · L3 Processes | key | tags=definition,exam,core | cards=card-009
Slot (i) of a question can ask for exactly this. Learn the pattern: *the distribution does not depend on a shift in time.*

* **First-order stationary:** $F_{t_1}(u_1) = F_{t_1+s}(u_1)$ for all $t_1, u_1, s$.
* **Second-order stationary:** $F_{t_1,t_2}(u_1,u_2) = F_{t_1+s,t_2+s}(u_1,u_2)$ for all $t_1,t_2,u_1,u_2,s$.
* **$n$-order stationary:** $F_{t_1,\dots,t_n}(u_1,\dots,u_n) = F_{t_1+s,\dots,t_n+s}(u_1,\dots,u_n)$.
* **Strictly stationary:** $n$-order stationary **for all** $n \in \mathbb{N}$.

**Lemma 1. Higher-order stationarity always implies lower-order stationarity.**

**Lemma 2.** A process is $n$-order stationary if the densities satisfy $p_{t_1,\dots,t_n} = p_{t_1+s,\dots,t_n+s}$.

## Check yourself
1. Give the definition of an $n$-order stationary process. :: Its $n$-dimensional c.d.f. is unchanged by a common time shift $s$ applied to all $n$ time points.
2. What is strict stationarity? :: $n$-order stationarity for every $n$.
3. Does second-order stationarity imply first-order? :: Yes — higher-order stationarity always implies lower-order.

@@ id=ts-wss | title=Stationarity in the wide sense | kind=concept | topic=TS · L3 Processes | key | tags=definition,exam,core | cards=card-009
> A stochastic process $x_t$ satisfying $Ex_t^2 < \infty$ is called **(weakly) stationary in the wide sense** if the mean function $Ex_t$ and the covariance $\text{Cov}(x_t, x_{t+h})$ **do not depend on $t$**.

That is: $m(t) = Ex_t = m_0$ is **constant**, and $\text{Cov}(x_t,x_s) = R(t,s) = R(t-s)$ depends **only on the difference** $t - s$.

**Lemma 3.** If $x_t$ is strictly stationary and $Ex_t^2 < \infty$, then $x_t$ is stationary in the wide sense.

**Lemma 4 — the five properties**, a very likely (ii) slot:

| Property | |
| --- | --- |
| a) | $R(0) = \text{Var}(x_t)$ for all $t$ |
| b) | $\rho(0) = 1$ |
| c) | $\|R(t)\| \leq R(0)$ |
| d) | $\|\rho(t)\| \leq 1$ |
| e) | $R(-t) = R(t)$ and $\rho(-t) = \rho(t)$ |

**Note the direction of Lemma 3.** Strict + finite second moment ⟹ wide sense. The converse is **false** in general — wide-sense stationarity constrains only the first two moments, and says nothing about the rest of the distribution.

## Check yourself
1. State the two conditions for wide-sense stationarity. :: The mean is constant in $t$, and the covariance depends only on the time difference.
2. Does wide-sense stationarity imply strict stationarity? :: No. Only the converse holds (given a finite second moment); WSS constrains only the first two moments.
3. Why is $|R(t)| \leq R(0)$? :: It follows from the Cauchy–Schwarz inequality applied to $\text{Cov}(x_t, x_{t+h})$, since $R(0)$ is the variance.

@@ id=ts-wss-proof | title=Proof: strict stationarity implies wide-sense | kind=formula | topic=TS · L3 Processes | key | tags=exam,proof | cards=card-074
Lemma 3 written out, since a (ii) slot can demand it.

**Claim.** If $x_t$ is strictly stationary and $Ex_t^2 < \infty$, then $x_t$ is stationary in the wide sense.

**Proof — the mean.** Strict stationarity gives $F_t(z) = F_{t_0}(z)$, and therefore $p_t(z) = p_{t_0}(z)$ for all $t$. Hence

$$m(t) = Ex_t = \int_{-\infty}^{\infty} z\,p_t(z)\,dz = \int_{-\infty}^{\infty} z\,p_{t_0}(z)\,dz = m(t_0)$$

so the mean is constant.

**Proof — the covariance.** Strict stationarity gives $F_{t_1,t_2}(z_1,z_2) = F_{t_1+s,t_2+s}(z_1,z_2)$ and hence $p_{t_1,t_2} = p_{t_1+s,t_2+s}$ for all $t_1,t_2,s$. So

$$R(t_1,t_2) = \int\int (z_1 - m)(z_2 - m)p_{t_1,t_2}(z_1,z_2)\,dz_1dz_2 = \int\int (z_1-m)(z_2-m)p_{t_1+s,t_2+s}\,dz_1dz_2$$

Choosing $s = -t_2$ gives

$$= \int\int (z_1-m)(z_2-m)p_{t_1-t_2,\,0}(z_1,z_2)\,dz_1dz_2$$

which depends **only on $t_1 - t_2$**. Thus $R(t_1,t_2) = R(t_1-t_2)$, and with the constant mean, $x_t$ is WSS. ∎

**Where $Ex_t^2 < \infty$ is used:** it is what guarantees the covariance exists at all. Say so — it is often a mark.

## Check yourself
1. What substitution makes the covariance depend only on the difference? :: Taking the shift $s = -t_2$, which maps $(t_1,t_2)$ to $(t_1-t_2, 0)$.
2. Where is the finite-second-moment assumption needed? :: To guarantee the covariance exists.

@@ id=ts-psd-proof | title=Proof: the correlation function is positive semidefinite | kind=formula | topic=TS · L3 Processes | key | tags=exam,proof,core | cards=card-074
Asked directly in the 2026 mock, Q1(ii) [3 marks].

**Claim.** The correlation function $\rho(t)$ of a stationary process is positive semidefinite: for any $n$, any times $t_1,\dots,t_n$ and any reals $c_1,\dots,c_n$,

$$\sum_{i=1}^{n}\sum_{j=1}^{n} c_ic_j\,\rho(t_i - t_j) \geq 0$$

**Proof.** Consider the random variable $Y = \sum_{i=1}^{n} c_i x_{t_i}$, where $x_t$ is the stationary process (take zero mean without loss of generality).

A variance is never negative, so $\text{Var}(Y) \geq 0$. Expanding:

$$0 \leq \text{Var}\left(\sum_i c_i x_{t_i}\right) = \sum_{i=1}^{n}\sum_{j=1}^{n} c_ic_j\,\text{Cov}(x_{t_i}, x_{t_j}) = \sum_{i=1}^{n}\sum_{j=1}^{n} c_ic_j\,R(t_i - t_j)$$

using stationarity in the last step. Dividing by $R(0) = \text{Var}(x_t) > 0$ and using $\rho(t) = R(t)/R(0)$:

$$\sum_{i=1}^{n}\sum_{j=1}^{n} c_ic_j\,\rho(t_i-t_j) \geq 0 \qquad \blacksquare$$

**The whole proof in one line, if you are short of time:** it is the variance of a linear combination, which cannot be negative.

This is also why not every function can be a covariance function — and it is exactly the property the **Bochner–Khinchin theorem** characterises spectrally.

## Check yourself
1. What single fact drives the proof? :: The variance of any linear combination $\sum c_ix_{t_i}$ is non-negative.
2. Why does this matter? :: It restricts which functions can be covariance functions at all — the content Bochner–Khinchin re-expresses via the spectral measure.

@@ id=ts-white-noise | title=White noise | kind=concept | topic=TS · L4 Named processes | key | tags=definition,exam,core | cards=card-010
> A stochastic process $\varepsilon_t$, $t \in \mathbb{Z}$ is called a **white noise process** if the sequence $\dots \varepsilon_{t-1}, \varepsilon_t, \varepsilon_{t+1}\dots$ consists of **independent and identically distributed** random variables with $E\varepsilon_t = m$ and $\text{Var}(\varepsilon_t) = \sigma^2$.

From the definition,

$$\text{Cov}(\varepsilon_t, \varepsilon_s) = \begin{cases}\sigma^2 & t = s \\ 0 & t \neq s\end{cases}$$

A white noise process is called **Gaussian white noise** if $\varepsilon_t$ has the Gaussian (normal) distribution.

```r
n = 100; m = 3; sigma = 1.2
eps = rnorm(n, m, sigma)
plot(c(1:n), eps, type = "p", pch = 19, main = "White noise")
```

**Note `rnorm(n, mean, sd)` takes the standard deviation, not the variance.** If a question gives $\sigma^2 = 9$, you write `rnorm(n, 2.3, 3)`. This is the single most common slip in the R-code slot.

## Check yourself
1. Define white noise. :: An i.i.d. sequence with constant mean and variance; covariance $\sigma^2$ at lag 0 and 0 otherwise.
2. In `rnorm(n, m, s)`, is `s` the variance or the standard deviation? :: The standard deviation — take the square root of a given variance.

@@ id=ts-random-walk | title=Random walk | kind=formula | topic=TS · L4 Named processes | key | tags=definition,exam,formula | cards=card-010
> A process $x_t$, $t \in \{1,2,\dots\}$ is called a **random walk** if $x_1 = \varepsilon_1$ and $x_t = \varepsilon_1 + \varepsilon_2 + \dots + \varepsilon_t$, where $\varepsilon_t$ is white noise with mean 0 and variance $\sigma^2$.

Equivalently $x_t = x_{t-1} + \varepsilon_t$.

**Lemma.** $Ex_t = 0$, $\text{Var}(x_t) = t\sigma^2$, $\text{Cov}(x_t,x_s) = \min(t,s)\sigma^2$, and $\rho(t,s) = \sqrt{t/s}$ for $t \leq s$.

**Proof of the covariance.** With $t \leq s$,

$$\text{Cov}(x_t,x_s) = E\left(\sum_{i=1}^{t}\varepsilon_i\right)\left(\sum_{j=1}^{s}\varepsilon_j\right) = \sum_{i=1}^{t}\text{Var}(\varepsilon_i) + \sum_{i \neq j}\text{Cov}(\varepsilon_i,\varepsilon_j) = t\sigma^2$$

since the cross terms vanish by independence. Then

$$\rho(t,s) = \dfrac{t\sigma^2}{\sqrt{t\sigma^2 \cdot s\sigma^2}} = \sqrt{t/s}$$

**The random walk is NOT stationary** — its variance $t\sigma^2$ grows with $t$. Being able to say why in one line is worth a mark.

```r
n=100; eps=rnorm(n,0,1.2); x=rep(0,n); x[1]=eps[1]
for(t in (2:n)) x[t]=x[t-1]+eps[t]
plot(c(1:n), x, type="p", pch=19, main="Random walk")
```

## Check yourself
1. Give the mean, variance and covariance of a random walk. :: $Ex_t=0$, $\text{Var}(x_t)=t\sigma^2$, $\text{Cov}(x_t,x_s)=\min(t,s)\sigma^2$.
2. Is a random walk stationary? Why? :: No — its variance grows linearly with $t$, so it is not constant in time.
3. Why do the cross terms vanish in the covariance proof? :: The white-noise increments are independent, so their covariances are zero.

@@ id=ts-wiener | title=Brownian motion / Wiener process | kind=concept | topic=TS · L4 Named processes | key | tags=definition,exam,core | cards=card-010
Asked in the 2026 mock Q3(i) and in the 2020 paper Q1(ii) — *define it and derive its mean and covariance*.

> A process $W_t$, $t \in [0,\infty)$ is called a **Brownian motion** (or **Wiener process**) if $W_t$ has **continuous realizations** and
>
> * $W_0 = 0$;
> * increments follow a **normal distribution**, $W_s - W_t \sim N(0, s-t)$ for all $0 \leq t \leq s$;
> * increments $W_s - W_t$ and $W_v - W_u$ are **independent** for all $0 \leq t < s \leq u < v$.

**Lemma.** $EW_t = 0$ and $R(t,s) = \text{Cov}(W_t,W_s) = \min(t,s)$.

**Derivation of the covariance.** Take $t \leq s$ and split $W_s = W_t + (W_s - W_t)$:

$$\text{Cov}(W_t, W_s) = E[W_t W_s] = E[W_t(W_t + (W_s - W_t))] = E[W_t^2] + E[W_t(W_s-W_t)]$$

The second term vanishes: $W_t = W_t - W_0$ and $W_s - W_t$ are increments over **disjoint** intervals, hence independent with zero mean. And $E[W_t^2] = \text{Var}(W_t) = t$ from the second axiom with $t=0$. So $\text{Cov}(W_t,W_s) = t = \min(t,s)$. ∎

> **A Brownian motion sampled on an equidistant grid is equivalent to a random walk.**

```r
n=100; tm=seq(0, 9, length.out=n)
eps=rnorm(n, 0, sqrt(tm[2]-tm[1]))
W=rep(0,n); W[1]=0; for(t in (2:n)) W[t]=W[t-1]+eps[t]
plot(tm, W, type="l", main="Wiener process")
```

**Note the `sqrt` in `rnorm`:** the increment over a step of length $\Delta$ has **variance** $\Delta$, so the **sd** is $\sqrt{\Delta}$.

## Check yourself
1. State the three defining conditions of a Wiener process. :: $W_0=0$; increments $W_s-W_t \sim N(0,s-t)$; increments over disjoint intervals are independent — with continuous realizations.
2. Derive $\text{Cov}(W_t,W_s)$ for $t \leq s$. :: Write $W_s = W_t + (W_s-W_t)$; the cross term vanishes by independence of disjoint increments, leaving $E[W_t^2] = t = \min(t,s)$.
3. What is the sd of the increment over a grid step of length $\Delta$? :: $\sqrt{\Delta}$, since the variance is $\Delta$.

@@ id=ts-brownian-bridge | title=Brownian bridge | kind=formula | topic=TS · L4 Named processes | tags=definition,exam | cards=card-010
> A process $B_t$, $t \in [0,1]$ is called a **Brownian bridge** if $B_1 = 0$ and $B_t$ is a Brownian motion on $[0,1]$.

$EB_t = 0$ and

$$R(t,s) = \text{Cov}(B_t,B_s) = \min(t,s) - ts$$

The process can be written as $B_t = W_t - tW_1$ — a Wiener process **tied down** to zero at both ends.

```r
n=100; tm=seq(0,1,length.out=n)
eps=rnorm(n, 0, sqrt(tm[2]-tm[1]))
W=rep(0,n); W[1]=0; for(t in (2:n)) W[t]=W[t-1]+eps[t]
B=W-tm*W[n]
plot(tm, B, type="l", main="Brownian bridge")
```

**Sanity check the formula:** at $t=s=1$, $R = 1 - 1 = 0$, matching $B_1 = 0$. At $t=s=1/2$ it gives $1/2 - 1/4 = 1/4$, the maximum variance — the bridge is most uncertain in the middle.

## Check yourself
1. Give the covariance function of a Brownian bridge. :: $R(t,s) = \min(t,s) - ts$.
2. How is it built from a Wiener process? :: $B_t = W_t - tW_1$.
3. Where is its variance largest, and what is it? :: At $t = 1/2$, where $\text{Var} = 1/4$.

@@ id=ts-poisson | title=Poisson process | kind=concept | topic=TS · L4 Named processes | tags=definition,exam | cards=card-010
> A process $P_t$, $t \in [0,\infty)$ is a **Poisson process** if
>
> * $P_0 = 0$;
> * the distribution of $P_t$ is Poisson $\mathcal{P}(\lambda t)$;
> * **independent increments** — $P_s - P_t$ and $P_v - P_u$ independent for $0 \leq t < s \leq u < v$;
> * **stationary increments** — $P(P_s - P_t < u) = P(P_{s-t} - P_0 < u)$;
> * $P_s - P_t \leq 1$ if $s - t$ is small enough.

**Interpretation.** It is a **counting process**, since $P_t$ is an integer for all $t$:

* *independent increments*: numbers of occurrences in **disjoint intervals** are independent;
* *stationary increments*: the distribution of the count in an interval depends **only on the interval's length**;
* the last condition means **no two counted occurrences are simultaneous**.

## Check yourself
1. What distribution does $P_t$ follow? :: Poisson with parameter $\lambda t$.
2. What does the condition $P_s - P_t \leq 1$ for small $s-t$ express? :: That occurrences do not happen simultaneously.

@@ id=ts-gaussian-sim | title=R: simulating a Gaussian process (the Cholesky recipe) | kind=formula | topic=TS · R code | key | tags=exam,code,R,core | cards=card-077
**This exact question appears in the mock (Q2 iii) and the 2020 paper (Q3 iii).** Learn the six lines; only the mean and covariance change.

Simulate at points $t_p$ with mean $m(t)$ and covariance $R(t,s)$:

```r
tp = c(0, 0.5, 1, 2, 3, 5, 7, 11)          # the given points
mt = 1.2 + 0.14*tp + 0.9*sin(0.8*tp)        # the given mean function m(t)
n = length(tp)
CovMtp = matrix(0, nrow=n, ncol=n)
for(i in c(1:n)) {
  for(j in c(1:n)) {
    CovMtp[i,j] = 1.6*exp(-0.7*abs(tp[i]-tp[j]))   # the given R(t,s)
  }
}
GausP = mt + t(chol(CovMtp)) %*% rnorm(n, 0, 1)
plot(tp, GausP, type="l", main="Gaussian process")
lines(tp, mt, col="red")
```

**Why it works:** if $\Sigma = L L^T$ with $L$ lower triangular (Cholesky) and $z \sim N(0,I)$, then $m + Lz$ has mean $m$ and covariance $LL^T = \Sigma$. R's `chol()` returns the **upper** triangular factor, which is why the code takes `t(chol(...))`.

**Adapting it to a new question** — only three things change:
1. `tp` — the list of points given;
2. `mt` — the mean function, e.g. $m(t) = 1.3/(1+t^2)$ becomes `1.3/(1+tp^2)`;
3. the body of the double loop — the covariance, e.g. $R(t,s) = e^{-|t-s|} + e^{-2|t-s|}$ becomes `exp(-abs(tp[i]-tp[j])) + exp(-2*abs(tp[i]-tp[j]))`.

## Check yourself
1. Why is `t(chol(...))` used rather than `chol(...)`? :: R's `chol` returns the upper-triangular factor; the construction $m + Lz$ needs the lower-triangular $L$, which is its transpose.
2. Write the covariance line for $R(t,s) = e^{-3|t-s|^{1.5}}$. :: `CovMtp[i,j] = exp(-3*abs(tp[i]-tp[j])^1.5)`.
3. What three parts of the template change between questions? :: The points `tp`, the mean function `mt`, and the covariance expression inside the loop.

@@ id=ts-l1-overview | title=Lecture 1 map: what a time-series answer is trying to do | kind=cheatsheet | topic=TS · L1 Overview | tags=workflow,model-choice,exam | cards=card-002,card-006
Lecture 1 is an orientation lecture, not a page of calculations. Its value is the **decision map** that tells you what later methods are for.

| Goal | What it means in this module | Later lecture block |
| --- | --- | --- |
| **Smoothing** | suppress high-frequency noise to reveal signal | L2 |
| **Decomposition** | separate trend, seasonality/cycles, and irregular noise | L1–L2, L14 |
| **Model fitting** | choose AR, MA, ARMA, ARIMA or SSA and estimate its parameters | L8–L15 |
| **Forecasting** | continue the series using the fitted model, with uncertainty where required | L6, L12–L15 |
| **Simulation** | generate a realization from a specified stochastic model | L4, L8–L9 |

**Exam-oriented reading rule.** For any unfamiliar series, first write:

1. What visible structure is present: trend, seasonality/cycle, changing variance, or noise?
2. Is the series plausibly stationary? If not, would a log transform and/or differencing help?
3. Which evidence will guide the model: covariance/correlogram, PACF, periodogram, or a stated equation?
4. Is the task smoothing, fitting, simulation, or forecasting? Do not apply a method before naming the task.

Lecture 1 also lists the syllabus spine: covariance/correlation/spectrum, time-domain prediction and bounds, AR/MA/ARMA, Yule–Walker estimation, ARIMA, and SSA. Use this as a coverage checklist, not as a formula sheet.

**Source:** `Learning Materials/ma3508_lecture1.pdf`, pp.2–4, 8–19.

## Check yourself
1. What are the four main actions carried through the module? :: Smooth/decompose, fit, forecast, and simulate.
2. What should you inspect before choosing a model? :: Trend/seasonality/cycles, changing variance, stationarity, the correlogram/PACF, and the periodogram.
3. Why is Lecture 1 not a "redo every worked example" lecture? :: It supplies the module map and datasets; the first numerical smoothing examples begin in Lecture 2.

@@ id=ts-smoothing | title=Smoothing: SMA, CMA, WMA and SES | kind=cheatsheet | topic=TS · L2 Smoothing | tags=definition,exam | cards=card-002,card-006
The model is **"signal + noise"**; the goal is to **suppress the noise** and estimate the underlying signal — decomposing the series into a **low-frequency "signal"** and a **high-frequency "noise"**.

| Method | Formula | Note |
| --- | --- | --- |
| **Simple MA** | $S_k = \dfrac{1}{m}\sum_{i=0}^{m-1}x_{k-i}$ | backward-looking; first $m-1$ values are NA |
| **Centered MA** | $C_k = \dfrac{1}{2m+1}\sum_{i=-m}^{m}x_{k+i}$ | **uses past and future — avoids time lag**; loses $m$ values at each end |
| **Weighted MA** | $W_k = \dfrac{1}{\sum_j w_j}\sum_{i=-m}^{m}w_ix_{k+i}$ | general form |
| **Simple exponential** | $E_k = \alpha x_k + (1-\alpha)E_{k-1}$, $\alpha \in (0,1)$ | $\alpha$ near 1 reacts quickly; near 0 is very smooth |

**Small $m$** follows the data closely and retains more noise; **large $m$** is smoother but **lags behind rapid changes**.

**Worked SMA, $m = 3$, on $\{3,7,2,5,4,8,6\}$:** $S_3 = 12/3 = 4.00$, $S_4 = 14/3 \approx 4.67$, $S_5 = 11/3 \approx 3.67$, $S_6 = 17/3 \approx 5.67$, $S_7 = 18/3 = 6.00$. The centered MA of window 3 gives the **same numbers shifted one place left** — $C_2 = 4.00$, and you lose $k=1$ and $k=7$.

**Practical use:** SMA and SES for **real-time (online) monitoring**; CMA and WMA for series **without periodicities, offline**; **Holt–Winters** for monthly econometric series.

**Source:** `Learning Materials/ma3508_lecture2.pdf`, pp.2–10, 13.

## Check yourself
1. Why does a centered moving average avoid time lag? :: It averages symmetrically over past and future values rather than only past ones.
2. In SES, what does $\alpha$ close to 1 do? :: Makes the model react quickly to changes, with little smoothing.
3. Prove that $\alpha = 1$ in SES returns the original series. :: $E_k = 1\cdot x_k + 0\cdot E_{k-1} = x_k$ for every $k$.

@@ id=ts-holt-winters | title=Holt–Winters | kind=formula | topic=TS · L2 Smoothing | tags=exam,code,R | cards=card-002,card-006
Extends exponential smoothing to capture **trend and seasonality simultaneously** with three smoothing equations for level $L_t$, trend $b_t$ and season $s_t$:

$$L_t = \alpha(x_t - s_{t-m}) + (1-\alpha)(L_{t-1} + b_{t-1})$$
$$b_t = \beta(L_t - L_{t-1}) + (1-\beta)b_{t-1}$$
$$s_t = \gamma(x_t - L_t) + (1-\gamma)s_{t-m}$$

where $m$ is the **seasonal period** (12 for monthly data). Think of $L_t$ as the current *centre* of the data.

| Model | When |
| --- | --- |
| **Additive** | seasonal variations roughly **constant** through the series |
| **Multiplicative** | seasonal variations change **proportionally to the level** |

```r
HWmodel <- HoltWinters(milkTS, seasonal = "additive")
plot(HWmodel)
library(forecast); plot(forecast(HWmodel, h = 12))

# exponential smoothing only (no trend, no season)
HoltWinters(milkTS, alpha = 0.2, beta = FALSE, gamma = FALSE)
```

**In R, `HoltWinters()` estimates $\alpha,\beta,\gamma$ automatically by minimising the squared prediction errors** — you only supply them to override.

**Source:** `Learning Materials/ma3508_lecture2.pdf`, pp.11–13.

## Check yourself
1. What do the three Holt–Winters equations track? :: Level, trend, and seasonal component.
2. When do you choose the multiplicative model? :: When the size of the seasonal swing grows with the level of the series.
3. How do you turn Holt–Winters into plain exponential smoothing in R? :: Set `beta = FALSE` and `gamma = FALSE`.
