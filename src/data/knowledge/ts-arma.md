@@ id=ts-arma-definition | title=ARMA(p,q): the definition | kind=concept | topic=TS · L8 ARMA | key | tags=exam,definition,core | cards=card-025
**Slot (i) material — the mock asks for both the zero-mean and the mean-$\mu$ versions** [2 marks].

> A stochastic process $x_t$, $t \in \mathbb{Z}$, is called an **autoregressive moving average process, ARMA(p,q), with zero mean** if $x_t$ is **stationary in the wide sense** and if for every $t$,
>
> $$x_t - a_1x_{t-1} - \dots - a_px_{t-p} = \varepsilon_t + b_1\varepsilon_{t-1} + \dots + b_q\varepsilon_{t-q}$$
>
> where $\varepsilon_t$ is white noise with mean 0 and variance $\sigma^2$, $a_p \neq 0$, $b_q \neq 0$, and the polynomials
> $$a(z) = 1 - a_1z - a_2z^2 - \dots - a_pz^p, \qquad b(z) = 1 + b_1z + \dots + b_qz^q$$
> **have no common factors (roots)**.

> A process $x_t$ is called an **ARMA(p,q) process with mean $\mu$** if the process $y_t = x_t - \mu$ is an ARMA(p,q) process with zero mean.

**Three conditions people drop, each worth a mark:** stationarity in the wide sense is *part of the definition*; $a_p \neq 0$ and $b_q \neq 0$ (otherwise the order is wrong); and **no common roots** (otherwise the representation is not unique).

**Special cases.** $x_t$ is an **AR(p)** process if it is ARMA(p,0), i.e. $a(B)x_t = \varepsilon_t$. It is an **MA(q)** process if it is ARMA(0,q), i.e. $x_t = b(B)\varepsilon_t$.

**Sign convention.** The AR coefficients enter $a(z)$ with **minus** signs and the MA coefficients enter $b(z)$ with **plus** signs. Getting this backwards inverts every root calculation that follows.

## Check yourself
1. Give the three side conditions in the ARMA definition. :: Wide-sense stationarity, $a_p \neq 0$ and $b_q \neq 0$, and no common roots of $a(z)$ and $b(z)$.
2. Write $a(z)$ and $b(z)$ for $x_t - 0.5x_{t-1} = \varepsilon_t + 0.3\varepsilon_{t-1}$. :: $a(z) = 1 - 0.5z$ and $b(z) = 1 + 0.3z$.
3. What is an ARMA process with mean $\mu$? :: One where $x_t - \mu$ is a zero-mean ARMA process.

@@ id=ts-backshift | title=The backward shift operator | kind=concept | topic=TS · L8 ARMA | key | tags=exam,definition | cards=card-025
> The operator $B$ is the **backward shift operator** if $Bx_t = x_{t-1}$.

Note $B^0x_t = x_t$ and $B^jx_t = x_{t-j}$.

The ARMA equation therefore becomes

$$a(B)x_t = b(B)\varepsilon_t, \qquad (1 - a_1B - \dots - a_pB^p)x_t = (1 + b_1B + \dots + b_qB^q)\varepsilon_t$$

**Why it matters:** it turns the whole subject into algebra with polynomials. Causality, invertibility, the MA representation and the spectral density are all read off $a(z)$ and $b(z)$ — and the only tool needed is the geometric series

$$\dfrac{1}{1-u} = 1 + u + u^2 + u^3 + \dots \qquad (|u| < 1)$$

## Check yourself
1. What is $B^3x_t$? :: $x_{t-3}$.
2. Write the ARMA equation in operator form. :: $a(B)x_t = b(B)\varepsilon_t$.
3. Which series expansion does every MA/AR representation question rely on? :: The geometric series $1/(1-u) = 1 + u + u^2 + \dots$ for $|u| < 1$.

@@ id=ts-causality | title=Causality and its root test | kind=concept | topic=TS · L8 ARMA | key | tags=exam,definition,core | cards=card-028
> An ARMA(p,q) process $x_t$ is called **causal** if there exist constants $c_0,c_1,c_2,\dots$ with $\sum_{j=0}^{\infty}|c_j| < \infty$ and
> $$x_t = \sum_{j=0}^{\infty}c_j\varepsilon_{t-j}$$
> for all $t \in \mathbb{Z}$.

In words: **the present depends only on present and past noise** — never on future noise.

> **Lemma.** Causality is equivalent to the **absence of roots of $a(z)$ inside or on the unit circle**: $a(z) \neq 0$ for all $|z| \leq 1$.

**The practical test — three steps.**

1. Write $a(z) = 1 - a_1z - \dots - a_pz^p$ (mind the minus signs).
2. Find its roots.
3. Causal ⟺ **every root has $|z| > 1$**, i.e. lies strictly **outside** the unit circle.

**Worked.** $x_t - 1.5x_{t-1} = \varepsilon_t + 0.5\varepsilon_{t-1}$: here $a(z) = 1 - 1.5z$ has root $z_1 = 2/3$, which is **inside** the unit circle, so the process is **not causal**.

**Worked.** $x_t = 0.5x_{t-1} + \varepsilon_t - 0.3\varepsilon_{t-1}$: $a(z) = 1 - 0.5z$ has root $z_1 = 2$, **outside**, so the process **is causal**.

**The direction is counter-intuitive** — roots must be *outside* the unit circle. For an AR(1) this is the familiar $|a_1| < 1$, since the root is $1/a_1$.

## Check yourself
1. Define causality. :: The process can be written as an absolutely summable one-sided moving average of present and past noise.
2. State the root condition. :: $a(z) \neq 0$ for all $|z| \leq 1$ — all roots strictly outside the unit circle.
3. Is $x_t - 1.3x_{t-1} = \varepsilon_t + 0.8\varepsilon_{t-1}$ causal? :: $a(z) = 1-1.3z$ has root $1/1.3 \approx 0.77 < 1$, inside the circle, so no.

@@ id=ts-invertibility | title=Invertibility and its root test | kind=concept | topic=TS · L8 ARMA | key | tags=exam,definition,core | cards=card-028
> An ARMA(p,q) process $x_t$ is called **invertible** if there exist constants $s_0,s_1,s_2,\dots$ with $\sum_{j=0}^{\infty}|s_j| < \infty$ and
> $$\varepsilon_t = \sum_{j=0}^{\infty}s_jx_{t-j}$$
> for all $t \in \mathbb{Z}$.

In words: **the noise can be recovered from present and past observations**.

> **Lemma.** Invertibility is equivalent to the **absence of roots of $b(z)$ inside or on the unit circle**: $b(z) \neq 0$ for all $|z| \leq 1$.

**Worked.** $x_t - 0.3x_{t-1} = \varepsilon_t + 1.8\varepsilon_{t-1}$: $b(z) = 1 + 1.8z$ has root $z_1 = -1/1.8 = -10/18 \approx -0.56$, **inside** the unit circle, so **not invertible**.

**Worked — the mock's Q1(iv)** [2 marks]. $x_t - 1.3x_{t-1} = \varepsilon_t + 0.8\varepsilon_{t-1}$. Here $b(z) = 1 + 0.8z$ with root $z_1 = -1/0.8 = -1.25$. Since $|-1.25| > 1$, the root lies **outside** the unit circle and the process **is invertible**.

**The symmetry to hold on to:**

| Property | Polynomial | Test |
| --- | --- | --- |
| **Causal** | $a(z)$ — the **AR** side | all roots $\|z\| > 1$ |
| **Invertible** | $b(z)$ — the **MA** side | all roots $\|z\| > 1$ |

Same test, different polynomial. A process can be one, both, or neither — the mock deliberately gives one process that is invertible but **not** causal.

## Check yourself
1. Define invertibility. :: The noise $\varepsilon_t$ can be written as an absolutely summable combination of present and past values of the process.
2. Which polynomial governs invertibility? :: $b(z)$, the moving-average polynomial.
3. Is $x_t + \frac{3}{8}x_{t-1} - x_{t-2} = \varepsilon_t - \frac{5}{8}\varepsilon_{t-1}$ causal? :: $a(z) = 1 + \frac38 z - z^2$; solve $-z^2 + 0.375z + 1 = 0$ to get roots near $1.20$ and $-0.83$. One root is inside the unit circle, so it is **not** causal.

@@ id=ts-stationary-existence | title=When a stationary solution exists | kind=concept | topic=TS · L8 ARMA | key | tags=exam,definition,core | cards=card-025
> **Theorem.** A stationary solution of the ARMA equations exists — and is the unique stationary solution — **if and only if $a(z)$ has no roots ON the unit circle**, that is $a(z) \neq 0$ for all $|z| = 1$.
>
> Then $x_t$ can be written as $x_t = \sum_{j=-\infty}^{\infty}c_j\varepsilon_{t-j}$, because $1/a(z)$ can be expanded in a Taylor series.

**Three conditions, easily confused — this is the distinction the exam probes:**

| Condition on roots of $a(z)$ | Consequence |
| --- | --- |
| No roots **on** $\|z\|=1$ | A unique **stationary** solution exists — but the sum may be **two-sided** |
| No roots **inside or on** $\|z\| \leq 1$ | **Causal** — the sum is **one-sided**, $j \geq 0$ |
| A root **on** $\|z\| = 1$ | **Non-stationary** (e.g. a unit root / random walk) |

**Note the difference in the sum limits:** stationary gives $\sum_{j=-\infty}^{\infty}$, causal gives $\sum_{j=0}^{\infty}$. Writing the causal one-sided sum when only stationarity holds is a real error.

## Check yourself
1. What is the condition for a unique stationary solution? :: No roots of $a(z)$ on the unit circle.
2. How does the resulting representation differ from the causal one? :: It is a two-sided sum over all integers $j$; the causal representation is one-sided with $j \geq 0$.
3. What happens if a root lies exactly on the unit circle? :: No stationary solution exists — the process is non-stationary.

@@ id=ts-stationarity-parameter | title=Finding parameter values that make a process (non-)stationary | kind=formula | topic=TS · L8 ARMA | key | tags=exam,calculation | cards=card-028
**A recurring slot (vii).** Mock Q1(vii): find at least two values of $c$ making $x_t = -3cx_{t-1} + 2cx_{t-2} + 6c^2x_{t-3} + \varepsilon_t$ non-stationary. 2020 Q1(vii): $x_t = 2x_{t-1} - 4cx_{t-3} + 8cx_{t-4} + \varepsilon_t$.

**Method.**

1. **Move everything to the left** and read off $a(z)$, remembering the sign flip. For the mock:
$$x_t + 3cx_{t-1} - 2cx_{t-2} - 6c^2x_{t-3} = \varepsilon_t \implies a(z) = 1 + 3cz - 2cz^2 - 6c^2z^3$$
2. **Factor if you can.** Group terms: $a(z) = (1 + 3cz) - 2cz^2(1 + 3cz) = (1 + 3cz)(1 - 2cz^2)$.
3. **Find the roots.** $z = -\dfrac{1}{3c}$ from the first factor, and $z = \pm\dfrac{1}{\sqrt{2c}}$ from the second.
4. **Non-stationary ⟺ some root lies exactly ON the unit circle**, i.e. $|z| = 1$.
   * $\left|-\dfrac{1}{3c}\right| = 1 \iff c = \pm\dfrac13$
   * $\left|\dfrac{1}{\sqrt{2c}}\right| = 1 \iff 2c = 1 \iff c = \dfrac12$ (and $c = -\frac12$ gives $|z|=1$ too)

So $c = 1/3$, $c = -1/3$, $c = 1/2$ all make the process non-stationary — the question asks for "at least two".

**The factoring step is where the marks are.** These polynomials are always constructed to factor by grouping; the coefficient pattern ($6c^2 = 3c \times 2c$ here) is the hint that it will.

**Watch the wording.** "Non-stationary" means a root **on** the circle. "Not causal" means a root **inside**. The 2020 paper asks for both stationary and non-stationary values of $c$, so read carefully.

## Check yourself
1. What condition on the roots makes the process non-stationary? :: At least one root of $a(z)$ lies exactly on the unit circle, $|z| = 1$.
2. Factor $1 + 3cz - 2cz^2 - 6c^2z^3$. :: $(1+3cz)(1-2cz^2)$, by grouping.
3. What is the difference between "non-stationary" and "not causal" in root terms? :: Non-stationary means a root on the unit circle; not causal means a root strictly inside it.

@@ id=ts-ma-representation | title=Finding the MA representation coefficients | kind=formula | topic=TS · L9 ARMA properties | key | tags=exam,calculation,core | cards=card-028
**Slot (v), worth 5–6 marks, in both the mock (Q1 v) and the 2020 paper (Q2 v).** *Find $c_0,c_1,c_2,c_3,c_4$ of the MA representation of a causal AR(3).*

**The fast method — match coefficients.** For $a(B)x_t = \varepsilon_t$ with $x_t = \sum_{j\geq0}c_j\varepsilon_{t-j}$, substitute and equate powers of $B$. Equivalently, solve the recursion directly:

$$c_0 = 1, \qquad c_j = a_1c_{j-1} + a_2c_{j-2} + \dots + a_pc_{j-p}$$

with $c_m = 0$ for $m < 0$.

**Worked — the mock.** $x_t = x_{t-1} - 0.5x_{t-2} - 0.2x_{t-3} + \varepsilon_t$, so $a_1 = 1$, $a_2 = -0.5$, $a_3 = -0.2$.

| | Recursion | Value |
| --- | --- | --- |
| $c_0$ | — | $1$ |
| $c_1$ | $a_1c_0 = 1(1)$ | $1$ |
| $c_2$ | $a_1c_1 + a_2c_0 = 1(1) + (-0.5)(1)$ | $0.5$ |
| $c_3$ | $a_1c_2 + a_2c_1 + a_3c_0 = 0.5 - 0.5 - 0.2$ | $-0.2$ |
| $c_4$ | $a_1c_3 + a_2c_2 + a_3c_1 = -0.2 - 0.25 - 0.2$ | $-0.65$ |

**Worked — 2020.** $x_t = x_{t-1} - 0.6x_{t-2} + 0.4x_{t-3} + \varepsilon_t$: $c_0=1$, $c_1=1$, $c_2 = 1-0.6 = 0.4$, $c_3 = 0.4-0.6+0.4 = 0.2$, $c_4 = 0.2-0.24+0.4 = 0.36$.

**The slower method the lectures show** — expanding $1/a(B)$ as a geometric series in $u = a_1B + \dots + a_pB^p$ — gives the same answer and is worth quoting as justification, but the recursion is what you should actually compute with under time pressure.

**Check your work:** $c_0$ is always 1, and $c_1$ is always $a_1$.

## Check yourself
1. Give the recursion for the MA coefficients of a causal AR(p). :: $c_0 = 1$ and $c_j = \sum_{i=1}^{p} a_ic_{j-i}$, with $c_m = 0$ for $m<0$.
2. What are $c_0$ and $c_1$ always equal to? :: $c_0 = 1$ and $c_1 = a_1$.
3. Why must the process be causal for this to work? :: Only a causal process has a one-sided representation $\sum_{j\geq0}c_j\varepsilon_{t-j}$ with summable coefficients.

@@ id=ts-arma-to-ma-worked | title=ARMA to MA and back to AR, worked in full | kind=formula | topic=TS · L10 Exercises | key | tags=exam,calculation | cards=card-028
The lecture's full worked pair for $x_t = 0.5x_{t-1} + \varepsilon_t - 0.3\varepsilon_{t-1}$.

**As an MA process (needs causality).** $a(z) = 1-0.5z$ has root $z_1 = 2$, outside the unit circle, so the process is causal. Then

$$x_t = \dfrac{1-0.3B}{1-0.5B}\varepsilon_t = (1-0.3B)\sum_{j\geq0}0.5^jB^j\varepsilon_t = \varepsilon_t + \sum_{j\geq1}(0.5^j - 0.3\cdot0.5^{j-1})B^j\varepsilon_t$$

$$= \varepsilon_t + \sum_{j\geq1}(0.5-0.3)\cdot0.5^{j-1}\varepsilon_{t-j} = \varepsilon_t + \sum_{j\geq1}0.2\cdot0.5^{j-1}\varepsilon_{t-j}$$

So $c_0 = 1$ and $c_j = 0.2 \times 0.5^{j-1}$.

**As an AR process (needs invertibility).** $b(z) = 1-0.3z$ has root $z_1 = 10/3$, outside the circle, so it is invertible. Symmetrically,

$$\varepsilon_t = \dfrac{1-0.5B}{1-0.3B}x_t = x_t - \sum_{j\geq1}0.2\cdot0.3^{j-1}x_{t-j}$$

**The pattern.** For ARMA(1,1) $\dfrac{1-\beta B}{1-\alpha B}$, the coefficients are $c_0 = 1$ and $c_j = (\alpha-\beta)\alpha^{j-1}$. Swap $\alpha \leftrightarrow \beta$ and negate for the AR direction. Recognising this saves several minutes.

**Covariance via the MA form.** Once $c_j$ is known,

$$R(k) = \sigma^2\sum_{s=0}^{\infty}c_sc_{s+|k|}$$

For this process the lecture computes $R(k) = \dfrac{0.85}{0.75}\times0.2\times0.5^{|k|-1}\sigma^2$ by summing the geometric series.

## Check yourself
1. Which property do you need to write an ARMA as an MA, and which for AR? :: Causality for the MA representation; invertibility for the AR representation.
2. Give the general ARMA(1,1) MA coefficients. :: $c_0=1$, $c_j = (\alpha-\beta)\alpha^{j-1}$ for the model $(1-\alpha B)x_t = (1-\beta B)\varepsilon_t$.
3. How do you get $R(k)$ from the MA coefficients? :: $R(k) = \sigma^2\sum_{s\geq0}c_sc_{s+|k|}$.

@@ id=ts-arma-spectral-density | title=Spectral density of an ARMA process | kind=formula | topic=TS · L8 ARMA | key | tags=exam,formula | cards=card-018
> **Theorem.** The spectral density of the ARMA(p,q) process satisfying $a(B)x_t = b(B)\varepsilon_t$ is
> $$f_x(\lambda) = \dfrac{\sigma^2}{2\pi}\dfrac{|b(e^{-i\lambda})|^2}{|a(e^{-i\lambda})|^2}$$

**The two special cases**, both worth memorising since they follow instantly:

**MA(1)**, $x_t = \varepsilon_t + b_1\varepsilon_{t-1}$:

$$f(\lambda) = \dfrac{\sigma^2}{2\pi}|1+b_1e^{-i\lambda}|^2 = \dfrac{\sigma^2}{2\pi}(1 + 2b_1\cos\lambda + b_1^2)$$

**AR(1)**, $x_t - a_1x_{t-1} = \varepsilon_t$:

$$f(\lambda) = \dfrac{\sigma^2}{2\pi|1-a_1e^{-i\lambda}|^2} = \dfrac{\sigma^2}{2\pi(1 - 2a_1\cos\lambda + a_1^2)}$$

**The expansion that produces them:** $|1 + be^{-i\lambda}|^2 = (1+be^{-i\lambda})(1+be^{i\lambda}) = 1 + b(e^{i\lambda}+e^{-i\lambda}) + b^2 = 1 + 2b\cos\lambda + b^2$, using $e^{i\lambda}+e^{-i\lambda} = 2\cos\lambda$. Show that step — it is the mark.

Note the sign difference: MA gives $+2b_1\cos\lambda$, AR gives $-2a_1\cos\lambda$, because $a(z)$ carries minus signs.

## Check yourself
1. Write the ARMA spectral density. :: $f_x(\lambda) = \frac{\sigma^2}{2\pi}|b(e^{-i\lambda})|^2/|a(e^{-i\lambda})|^2$.
2. Expand $|1+be^{-i\lambda}|^2$. :: $1 + 2b\cos\lambda + b^2$, using $e^{i\lambda}+e^{-i\lambda}=2\cos\lambda$.
3. Why does the AR(1) density have a minus sign in the cosine term? :: Because $a(z) = 1 - a_1z$ carries a minus sign, unlike $b(z)$.

@@ id=ts-arma-sim-r | title=R: simulating an ARMA process | kind=formula | topic=TS · R code | key | tags=exam,code,R,core | cards=card-077
**Mock Q3(iii)** [3 marks]: simulate a realization of length 160 from an ARMA(3,1) with given initial values.

The template, from the lecture's ARMA(3,2) example:

```r
n = 160
eps = rnorm(n, 0, sqrt(1.7))       # variance 1.7 -> sd = sqrt(1.7)
x = rep(0, n)
x[1] = 2.1; x[2] = -1.2; x[3] = 1.7    # the given initial values

for(t in (4:n))
  x[t] = 0.7*x[t-1] - 0.4*x[t-2] + 0.1*x[t-3] +
         eps[t] + 0.5*eps[t-1]

plot((1:n), x, type = "l", main = "ARMA(3,1)")
```

**The sign trap.** The question states $x_t - 0.7x_{t-1} + 0.4x_{t-2} - 0.1x_{t-3} = \varepsilon_t + 0.5\varepsilon_{t-1}$. Rearranging for $x_t$ **flips the sign of every AR term**:

$$x_t = 0.7x_{t-1} - 0.4x_{t-2} + 0.1x_{t-3} + \varepsilon_t + 0.5\varepsilon_{t-1}$$

The MA terms on the right keep their signs. Transcribing the equation without rearranging is the commonest error in this slot.

**Loop bounds.** Start at `t = p+1` (here 4) so all lagged terms exist. The number of given initial values always equals $p$.

## Check yourself
1. Variance $\sigma^2 = 1.7$ is given. What goes in `rnorm`? :: `sqrt(1.7)`, the standard deviation.
2. The equation is $x_t - 0.7x_{t-1} = \dots$. What sign does the $x_{t-1}$ term take in the loop? :: Plus 0.7 — moving it across the equals sign flips its sign.
3. Where must the loop start for an AR order $p$? :: At $t = p+1$, so that all $p$ lags are defined.

@@ id=ts-arma-mean | title=The mean of an ARMA process with a constant | kind=formula | topic=TS · L11 Fitting | key | tags=exam,calculation | cards=card-034
A small but reliable mark. **Task:** compute the mean of $x_t = 0.2 + 0.4x_{t-1} + 0.5x_{t-2} + \varepsilon_t + 0.7\varepsilon_{t-1}$.

**Method — take expectations of both sides.** Since $Ex_j = \mu$ for all $j$ (stationarity) and $E\varepsilon_j = 0$:

$$\mu = 0.2 + 0.4\mu + 0.5\mu \implies \mu(1 - 0.4 - 0.5) = 0.2 \implies \mu = \dfrac{0.2}{0.1} = 2$$

**In general**, for $x_t = \delta + \sum_i a_ix_{t-i} + \text{MA terms}$,

$$\mu = \dfrac{\delta}{1 - a_1 - a_2 - \dots - a_p} = \dfrac{\delta}{a(1)}$$

The denominator is exactly $a(1)$ — the AR polynomial evaluated at $z=1$. If $a(1) = 0$ there is no stationary mean, which is another way of seeing a unit root.

**Watch the direction of conversion.** A model written as $x_t - \mu = a_1(x_{t-1}-\mu) + \dots$ is already in mean form; one written with a constant $\delta$ needs this conversion. Forecasting questions usually give the first form, fitting questions the second.

## Check yourself
1. Compute the mean of $x_t = 1.2 + 0.3x_{t-1} + 0.2x_{t-2} + \varepsilon_t$. :: $\mu = 1.2/(1-0.3-0.2) = 1.2/0.5 = 2.4$.
2. What is the general formula, and what is the denominator? :: $\mu = \delta/a(1)$, the AR polynomial evaluated at $z = 1$.
3. What does $a(1) = 0$ signify? :: A unit root — no stationary mean exists.

@@ id=ts-yule-walker | title=Yule–Walker estimation | kind=formula | topic=TS · L11 Fitting | key | tags=exam,calculation,core | cards=card-037
**Slot (vi)/(vii) — the mock Q3(vii) and 2020 Q1(vi)** [5 marks]. Estimate AR coefficients and the noise variance.

**The three steps.**

1. **Estimate the mean:** $\bar{X}_n = \frac1n\sum_j x_j$.
2. **Estimate the correlation function:** $\hat\rho(k) = \hat{R}(k)/\hat{R}(0)$.
3. **Solve the Yule–Walker system** for $a_1,\dots,a_p$:

$$\hat\rho(1) = a_1\hat\rho(0) + a_2\hat\rho(1) + \dots + a_p\hat\rho(1-p)$$
$$\hat\rho(2) = a_1\hat\rho(1) + a_2\hat\rho(0) + \dots + a_p\hat\rho(2-p)$$
$$\vdots$$
$$\hat\rho(p) = a_1\hat\rho(p-1) + a_2\hat\rho(p-2) + \dots + a_p\hat\rho(0)$$

In matrix form $\hat{a} = \hat{C}^{-1}\hat{v}$ where $\hat{v} = (\hat\rho(1),\dots,\hat\rho(p))^T$ and $\hat{C} = [\hat\rho(i-j)]_{i,j=1}^{p}$.

**Noise variance:**

$$\hat\sigma^2 = \hat{R}(0)\left(1 - \hat{a}_1\hat\rho(1) - \dots - \hat{a}_p\hat\rho(p)\right)$$

**Derivation of that last formula**, in case it is asked:

$$R(0) = E(x_t-\mu)(x_t-\mu) = E(x_t-\mu)\left[\sum_i a_i(x_{t-i}-\mu) + \varepsilon_t\right] = \sum_i a_iR(i) + \sigma^2$$

so $\sigma^2 = R(0)[1 - \sum_i a_i\rho(i)]$.

**For an AR(2) specifically** — the most common case — the system is

$$\rho(1) = a_1 + a_2\rho(1), \qquad \rho(2) = a_1\rho(1) + a_2$$

giving $a_1 = \dfrac{\rho(1)(1-\rho(2))}{1-\rho(1)^2}$ and $a_2 = \dfrac{\rho(2)-\rho(1)^2}{1-\rho(1)^2}$, using $\rho(0)=1$.

**Beware the distinction the lecture flags:** the matrix $\hat{C}$ here uses the **correlation** function, while the forecasting matrix $\Sigma$ of Lecture 6 uses the **covariance**. Mixing them costs the answer.

## Check yourself
1. What are the three steps of Yule–Walker estimation? :: Estimate the mean, estimate the correlation function, then solve the Yule–Walker linear system for the coefficients.
2. Give the noise-variance estimator. :: $\hat\sigma^2 = \hat{R}(0)(1 - \sum_i \hat a_i \hat\rho(i))$.
3. Solve the AR(2) system for $a_2$. :: $a_2 = (\rho(2)-\rho(1)^2)/(1-\rho(1)^2)$.
4. Does $\hat C$ use correlations or covariances? :: Correlations — unlike the forecasting matrix $\Sigma$, which uses covariances.

@@ id=ts-yule-walker-worked | title=Yule–Walker for AR(2), worked | kind=formula | topic=TS · L11 Fitting | key | tags=exam,calculation | cards=card-037
**The mock's Q3(vii)** [5 marks] runs the other way: given the model, find the variance and correlation function.

**Task.** $x_t = 0.8x_{t-1} - 0.4x_{t-2} + \varepsilon_t$ with $\sigma^2 = 1.3$. Find $\text{Var}(x_t)$ and $\rho(k)$ using Yule–Walker.

**Step 1 — the correlation recursion.** Multiply the equation by $x_{t-k}$ and take expectations. For $k \geq 1$ the noise term drops out (causality), giving

$$\rho(k) = 0.8\rho(k-1) - 0.4\rho(k-2), \qquad k \geq 1$$

**Step 2 — get $\rho(1)$.** Put $k=1$ and use $\rho(0)=1$, $\rho(-1)=\rho(1)$:

$$\rho(1) = 0.8 - 0.4\rho(1) \implies 1.4\rho(1) = 0.8 \implies \rho(1) = \dfrac{4}{7} \approx 0.571$$

**Step 3 — iterate.**

$$\rho(2) = 0.8(0.571) - 0.4(1) = 0.057, \qquad \rho(3) = 0.8(0.057) - 0.4(0.571) = -0.183$$

**Step 4 — the variance.** From $R(0) = \sum_i a_iR(i) + \sigma^2 = R(0)[a_1\rho(1)+a_2\rho(2)] + \sigma^2$:

$$R(0) = \dfrac{\sigma^2}{1 - a_1\rho(1) - a_2\rho(2)} = \dfrac{1.3}{1 - 0.8(0.571) + 0.4(0.057)} = \dfrac{1.3}{0.566} \approx 2.30$$

**The two moves to remember:** for $k \geq 1$ the correlation obeys the *same recursion as the process*, and $\rho(-k) = \rho(k)$ is what closes the system at $k=1$.

## Check yourself
1. Why does the noise term vanish for $k \geq 1$? :: For a causal process $x_{t-k}$ depends only on noise up to time $t-k$, so it is uncorrelated with $\varepsilon_t$.
2. What identity closes the system at $k=1$? :: $\rho(-1) = \rho(1)$, by symmetry of the correlation function.
3. Give the variance formula for an AR(p). :: $R(0) = \sigma^2/(1 - \sum_i a_i\rho(i))$.

@@ id=ts-ma1-estimation | title=Estimating MA(1) parameters | kind=formula | topic=TS · L11 Fitting | key | tags=exam,calculation | cards=card-037
**Mock Q3(vi)** [4 marks]: given $\bar{X}_n = 2.7$, $\hat{R}(0) = 4.8$, $\hat{R}(1) = 1.2$ for an invertible MA(1), estimate $b_1$ and $\sigma^2$.

**Theory.** For $x_t = \varepsilon_t + b_1\varepsilon_{t-1}$:

$$R(0) = \sigma^2(1+b_1^2), \qquad R(1) = \sigma^2 b_1, \qquad R(k) = 0 \text{ for } |k| \geq 2$$

so

$$\rho(1) = \dfrac{R(1)}{R(0)} = \dfrac{b_1}{1+b_1^2}$$

**Method — solve the quadratic.** With $\hat\rho(1) = 1.2/4.8 = 0.25$:

$$\dfrac{b_1}{1+b_1^2} = 0.25 \implies 0.25b_1^2 - b_1 + 0.25 = 0 \implies b_1^2 - 4b_1 + 1 = 0$$

$$b_1 = \dfrac{4 \pm \sqrt{16-4}}{2} = 2 \pm \sqrt{3}$$

giving $b_1 \approx 3.732$ or $b_1 \approx 0.268$.

**Choose the invertible root.** Invertibility requires $|b_1| < 1$, so $b_1 = 2-\sqrt3 \approx 0.268$. **Saying why you rejected the other root is worth a mark.**

**Then the variance:**

$$\hat\sigma^2 = \dfrac{\hat{R}(0)}{1+b_1^2} = \dfrac{4.8}{1+0.0718} \approx 4.48$$

**Existence check:** $|\rho(1)| \leq 1/2$ always for an MA(1), since $b/(1+b^2)$ is maximised at $b=1$. If a question hands you $|\hat\rho(1)| > 0.5$, no MA(1) fits — say so.

## Check yourself
1. Give $\rho(1)$ for an MA(1). :: $b_1/(1+b_1^2)$.
2. The quadratic gives two roots. Which do you keep and why? :: The one with $|b_1| < 1$, because the process is stated to be invertible.
3. What is the largest possible $|\rho(1)|$ for an MA(1), and why does it matter? :: $1/2$ — if the data give more, no MA(1) model can fit.

@@ id=ts-forecast-ar1 | title=Forecasting AR(1): the closed form | kind=formula | topic=TS · L12 Forecasting | key | tags=exam,formula,core | cards=card-040
**Theorem.** For a time series from an AR(1) process $x_t = ax_{t-1} + \varepsilon_t$, the $h$-step ahead predictor is

$$\hat{x}_{n+h} = a^hx_n$$

and

$$MSE(\hat{x}_{n+h}) = \sigma^2\dfrac{1-a^{2h}}{1-a^2}$$

If $\varepsilon_t$ is Gaussian, the prediction bound for $x_{n+h}$ is

$$\left(\hat{x}_{n+h} - z_{1-\alpha/2}\sigma\sqrt{\dfrac{1-a^{2h}}{1-a^2}},\ \hat{x}_{n+h} + z_{1-\alpha/2}\sigma\sqrt{\dfrac{1-a^{2h}}{1-a^2}}\right)$$

**With a mean $\mu$**, apply it to the centred process:

$$\hat{x}_{n+h} = \mu + a^h(x_n - \mu)$$

**Worked — the lecture's example.** $\mu = 9$, $a = 0.6$, $\sigma^2 = 0.1^2$, $x_{100} = 8.9$:

* $\hat{x}_{101} = 9 + 0.6(-0.1) = 8.94$
* $\hat{x}_{102} = 9 + 0.36(-0.1) = 8.964$
* $\hat{x}_{103} = 9 + 0.216(-0.1) = 8.9784$

**Worked — the mock's Q2(vi).** $x_t - 5 = 0.7(x_{t-1}-5) + \varepsilon_t$, $\sigma^2 = 1.44$, $x_{12} = 6.2$. Then $x_{12}-\mu = 1.2$ and

$\hat{x}_{13} = 5 + 0.7(1.2) = 5.84$; $\hat{x}_{14} = 5+0.49(1.2) = 5.588$; $\hat{x}_{15} = 5+0.343(1.2) = 5.412$; $\hat{x}_{16} = 5+0.2401(1.2) = 5.288$.

with $MSE(\hat{x}_{12+h}) = 1.44\dfrac{1-0.49^h}{1-0.49}$.

**Two properties worth one sentence each.** The forecast **decays geometrically to the mean** as $h$ grows, and the MSE **increases** with $h$, tending to the process variance $\sigma^2/(1-a^2)$ — you learn nothing about the far future beyond its unconditional distribution.

## Check yourself
1. Give the $h$-step AR(1) forecast with mean $\mu$. :: $\hat{x}_{n+h} = \mu + a^h(x_n - \mu)$.
2. What does the forecast tend to as $h \rightarrow \infty$? :: The mean $\mu$, geometrically.
3. What does the MSE tend to? :: The process variance $\sigma^2/(1-a^2)$.

@@ id=ts-forecast-arp | title=Forecasting AR(p): recursive substitution | kind=formula | topic=TS · L13 Forecasting | key | tags=exam,calculation,core | cards=card-040
**Slot (vi) — the mock's Q1(vi) is an AR(2)** [5 marks]. The method is the same for any $p$.

**Rule.** Write the model for $x_{n+h}$, set future noise to zero (it has zero mean), and **replace any unobserved $x$ by its own forecast**.

**Worked — the lecture's AR(3).** $x_t = 0.2x_{t-1} - 0.2x_{t-2} + 0.6x_{t-3} + \varepsilon_t$, with $x_8 = 3.0$, $x_9 = -3.5$, $x_{10} = -0.74$:

$$\hat{x}_{11} = 0.2(-0.74) - 0.2(-3.5) + 0.6(3.0) = 2.35$$
$$\hat{x}_{12} = 0.2(2.35) - 0.2(-0.74) + 0.6(-3.5) = -1.482$$
$$\hat{x}_{13} = 0.2(-1.482) - 0.2(2.35) + 0.6(-0.74) = -1.21$$

Note how $\hat x_{11}$ feeds into $\hat x_{12}$, and both feed into $\hat x_{13}$.

**Worked — the mock's AR(2) with a mean.** $x_t - 11 = 0.5(x_{t-1}-11) - 0.4(x_{t-2}-11) + \varepsilon_t$, $\sigma^2 = 0.6$, last observations $13, 10, 15, 14$. Centre first: the last two centred values are $x_n - 11 = 3$ and $x_{n-1}-11 = 4$.

$$\hat{x}_{n+1} = 11 + 0.5(3) - 0.4(4) = 11 - 0.1 = 10.9$$
$$\hat{x}_{n+2} = 11 + 0.5(10.9-11) - 0.4(3) = 11 - 0.05 - 1.2 = 9.75$$

**The MSE for $h \geq 2$ needs the MA coefficients:**

$$MSE(\hat{x}_{n+h}) = \sigma^2\sum_{i=0}^{h-1}c_i^2$$

For this AR(2), $c_0 = 1$, $c_1 = 0.5$, so $MSE(\hat x_{n+1}) = 0.6$ and $MSE(\hat x_{n+2}) = 0.6(1+0.25) = 0.75$. Bounds are $\hat{x} \pm z_{1-\alpha/2}\sqrt{MSE}$.

**Always centre before recursing when a mean is given** — using raw values with a centred equation is the single most common error here.

## Check yourself
1. What is the rule for forecasting an AR(p) several steps ahead? :: Write the equation, drop the future noise, and substitute forecasts for any unobserved values.
2. Give the general MSE formula. :: $MSE(\hat x_{n+h}) = \sigma^2\sum_{i=0}^{h-1}c_i^2$ using the MA representation coefficients.
3. What is $MSE(\hat x_{n+1})$ always equal to? :: $\sigma^2$, since only $c_0 = 1$ contributes.

@@ id=ts-arima-sarima | title=ARIMA and SARIMA: difference first, then use ARMA | kind=formula | topic=TS · L13 Integrated models | key | tags=exam,definition,forecasting | cards=card-034,card-040
An ARIMA process is not a separate set of forecasting rules. It is the lecture's **difference-then-ARMA** construction.

> $x_t$ is ARIMA$(p,d,q)$ if $(1-B)^d x_t$ is ARMA$(p,q)$:
>
> $$a(B)(1-B)^d x_t=b(B)\varepsilon_t.$$

Here $d$ is the number of ordinary differences. In particular,

$$\text{ARIMA}(0,1,0):\quad (1-B)x_t=\varepsilon_t\quad\Longleftrightarrow\quad x_t=x_{t-1}+\varepsilon_t,$$

so ARIMA$(0,1,0)$ is a random walk.

**Worked structure: ARIMA$(1,1,0)$.**

$$(1-aB)(1-B)x_t=\varepsilon_t
\quad\Longrightarrow\quad
x_t=(1+a)x_{t-1}-ax_{t-2}+\varepsilon_t.$$

Forecast by setting future noise to zero and recursing:

$$\hat{x}_{n+1}=(1+a)x_n-ax_{n-1},\qquad
\hat{x}_{n+2}=(1+a)\hat{x}_{n+1}-ax_n.$$

**Seasonal extension.** SARIMA$(p,d,q)(P,D,Q)_s$ applies both ordinary and seasonal differencing:

$$y_t=(1-B)^d(1-B^s)^Dx_t,$$

then models $y_t$ with

$$a(B)\tilde a(B^s)y_t=b(B)\tilde b(B^s)\varepsilon_t.$$

For monthly data, $s=12$. The lecture's SARIMA$(1,0,1)(1,0,0)_{12}$ example expands to

$$x_t-a_1x_{t-1}-\tilde a_1x_{t-12}+a_1\tilde a_1x_{t-13}
=\varepsilon_t-b_1\varepsilon_{t-1}.$$

**Exam traps**

* $d$ and $D$ are differencing orders, not AR or MA orders.
* Expand the two polynomial factors carefully: the cross-term at lag $13$ has a plus sign in this example.
* Forecast the differenced/model equation, then return to the original scale when the question asks for original observations.

**Source:** `Complete lecture notes/ma3508_lecture13.pdf`, pp.6–9, 14–15.

## Check yourself
1. What does the "I" in ARIMA mean operationally? :: Difference the series $d$ times so the transformed series follows an ARMA model.
2. What familiar process is ARIMA$(0,1,0)$? :: A random walk.
3. What does the seasonal period $s=12$ mean? :: The seasonal operators act at lags 12, 24, and so on, appropriate for monthly annual seasonality.

@@ id=ts-acf-pacf | title=ACF and PACF: use the lecture evidence, not a slogan | kind=cheatsheet | topic=TS · L14 Model identification | key | tags=exam,diagnostics,R | cards=card-044,card-047
The lecture uses the sample ACF (correlogram), PACF, and periodogram as **diagnostic evidence** after making a series approximately stationary.

| Diagnostic pattern | Lecture-supported interpretation |
| --- | --- |
| ACF slowly decreasing | an AR$(p)$ model may be relevant |
| ACF quickly decreasing / cutting off | an MA$(q)$ model may be relevant; theoretically an MA$(q)$ covariance is zero beyond lag $q$ |
| Slightly damped oscillations | a cyclical component may be present |
| PACF | additional evidence for the number of AR terms; inspect it with the ACF rather than treating either plot as a proof |
| Periodogram peak | a frequency/period with a large contribution |

**Discipline:** these are model-identification cues, not guarantees. Fit plausible candidates and compare the fitted output; do not declare an order from one noisy sample plot alone.

```r
acf(y, lag.max = length(y))
pacf(y, lag.max = min(150, length(y) - 1))
```

**Sources:** `Learning Materials/ma3508_lecture14.pdf`, pp.2, 4–5, 12–15, 19–24; `Complete lecture notes/ma3508_lecture8.pdf`, p.10 for the MA$(q)$ cutoff.

## Check yourself
1. What does a slowly decreasing correlogram suggest? :: An AR model may be relevant.
2. What exact theoretical fact supports the MA cutoff cue? :: For MA$(q)$, $R(k)=0$ for $|k|>q$.
3. Why is an ACF/PACF pattern not a final model choice? :: It is sample diagnostic evidence; candidate models still need fitting and comparison.

@@ id=ts-aic-model-choice | title=AIC model choice: compare fitted candidates defensibly | kind=cheatsheet | topic=TS · L14 Model identification | key | tags=exam,diagnostics,AIC | cards=card-044,card-047,card-066
Lecture 14 compares fitted candidates using four pieces of evidence:

1. a **small number of parameters** for interpretation;
2. a **small estimated noise variance** $\hat{\sigma}^2$;
3. a **large log-likelihood**;
4. a **small reported AIC**.

The lecture tables report AIC values but do not derive an AIC formula. For a lecture-faithful answer, compare the reported values and explain the fit-versus-complexity trade-off. Do not automatically choose a much larger model for a tiny AIC improvement.

**Worked reading of the Nile table.** ARMA$(3,1)$ has AIC $7514.25$ while ARMA$(3,2)$ has AIC $7515.21$. The extra MA term does not improve AIC, so the smaller ARMA$(3,1)$ is preferred between those two candidates.

**Source:** `Learning Materials/ma3508_lecture14.pdf`, pp.7, 15, 22.

## Check yourself
1. Is a larger or smaller AIC preferred? :: Smaller.
2. Name the other three criteria shown beside AIC. :: Fewer parameters, smaller estimated noise variance, and larger log-likelihood.
3. Why not choose the most complex fitted model automatically? :: Extra parameters cost interpretability and may not improve the penalised AIC.

@@ id=ts-real-data-workflow | title=The real-data workflow | kind=cheatsheet | topic=TS · L14 Real data | key | tags=exam,workflow,R | cards=card-044
The four-step procedure from Lecture 14, which is also the shape of any "analyse this series" answer.

1. **Plot the series and guess a model.** Usually $x_t$ is the sum of a **trend**, **seasonal or cyclical** components, and an **irregular/noise** component.
2. **If non-stationary, transform.**
   * If $\text{Var}(x_t)$ is **increasing** and $x_t > 0$, take the **logarithm** $y_t = \log(x_t)$.
   * If the **mean function is not constant**, take **differences** $y_t = x_t - x_{t-1}$.
3. **Compute the correlogram and PACF and propose candidate models:**
   * **slightly damped oscillations** → a significant **cyclical** component;
   * **slowly decreasing** → an **AR(p)** model may be relevant;
   * **quickly decreasing** → an **MA(q)** model may be relevant.
4. **Compute the periodogram** and identify frequencies with a large contribution.
5. **Fit and compare plausible candidates** using parameter count, $\hat\sigma^2$, log-likelihood and reported AIC; then forecast from the selected model.

**The airline-passenger example** (Box & Jenkins, 1949–60) applies both transformations: **take the logarithm, then take differences** to obtain a stationary series.

```r
airpass = read.csv("http://ssa.cf.ac.uk/ma0367/airpass.csv", sep=";", header=TRUE)
plot(airpass[,3], type="l")
y = diff(log(airpass[,3]))          # log then difference
acf(y, length(y), lwd=4)            # correlogram
arima(y, order=c(1,0,0))
arima(y, order=c(1,0,1), seasonal=list(order=c(1,0,0), period=12))
```

**The correlogram reading in step 3 is the examinable part** — slowly decaying means AR, sharply cutting off means MA. An MA(q) correlogram is exactly zero beyond lag $q$.

**Source:** `Learning Materials/ma3508_lecture14.pdf`, pp.2–9, 12–24.

## Check yourself
1. What transformation fixes increasing variance, and what fixes a non-constant mean? :: Logarithm for increasing variance; differencing for a non-constant mean.
2. A correlogram decays slowly. AR or MA? :: AR — an MA(q) correlogram cuts off sharply after lag $q$.
3. In what order were the two transformations applied to the airline data? :: Logarithm first, then differencing.
