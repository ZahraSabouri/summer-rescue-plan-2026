@@ id=ts-mercer-kl | title=Mercer and Karhunen–Loève expansions | kind=formula | topic=TS · L5 Spectral | key | tags=exam,definition,core | cards=card-015
**Slot (i) material — asked verbatim in the 2026 mock Q1(i) and the 2020 paper Q2(i)** [2 marks]. Two sentences, both needed.

> **Theorem.** Let $x_t$ be a stochastic process defined on $[a,b]$ such that $Ex_t = 0$ and the covariance function $R(t,s) = Ex_tx_s$ is continuous. Then there is the **Mercer expansion of the covariance function**
>
> $$R(t,s) = \sum_{j=1}^{\infty}\lambda_j\varphi_j(t)\varphi_j(s)$$
>
> where $\varphi_1(t),\varphi_2(t),\dots$ form an **orthonormal basis of $L^2([a,b])$**. Also, there is the **Karhunen–Loève expansion of the stochastic process**
>
> $$x_t = \sum_{j=1}^{\infty}\varepsilon_j\sqrt{\lambda_j}\varphi_j(t)$$
>
> where $\{\varepsilon_j\}$ is **white noise with unit variance**.

**The distinction that earns the marks:** Mercer expands the **covariance function**; Karhunen–Loève expands the **process itself**. Same eigenvalues $\lambda_j$ and eigenfunctions $\varphi_j$, two different objects.

## Check yourself
1. What does Mercer expand, and what does Karhunen–Loève expand? :: Mercer expands the covariance function $R(t,s)$; Karhunen–Loève expands the process $x_t$.
2. What are the conditions of the theorem? :: Zero mean and a continuous covariance function on the interval.
3. What are the $\varepsilon_j$ in the KL expansion? :: White noise with unit variance.

@@ id=ts-bochner-khinchin | title=The Bochner–Khinchin theorem | kind=formula | topic=TS · L5 Spectral | key | tags=exam,definition,core | cards=card-018
**Asked as the opening definition in the 2020 paper** [2 marks]. Both cases; the difference is the limits of integration.

**Continuous case.** Let $x_t$ be a weakly stationary continuous process, $Ex_t = 0$, $R(t-s) = Ex_tx_s$. Then there is the **spectral representation**

$$R(t) = \int_{-\infty}^{\infty}e^{it\lambda}dF(\lambda)$$

where $F(\lambda)$ is called a **spectral distribution**. If $F$ is absolutely continuous,

$$R(t) = \int_{-\infty}^{\infty}e^{it\lambda}f(\lambda)d\lambda$$

where $f(\lambda)$ is the **spectral density** (a spectrum).

**Discrete case.** For a weakly stationary discrete process $x_k$,

$$R(k) = \int_{-\pi}^{\pi}e^{ik\lambda}dF(\lambda), \qquad R(k) = \int_{-\pi}^{\pi}e^{ik\lambda}f(\lambda)d\lambda$$

> **In the discrete case, integrals have different limits of integration** — $[-\pi,\pi]$ rather than $(-\infty,\infty)$.

The process itself has the spectral representation $x_t = \int e^{it\lambda}d\mu(\lambda)$, where $i = \sqrt{-1}$ and $e^{it\lambda} = \cos(t\lambda) + i\sin(t\lambda)$.

**State the limits explicitly.** That one detail is the whole difference between the two cases, and dropping it loses the mark.

## Check yourself
1. What is the only structural difference between the continuous and discrete statements? :: The limits of integration — $(-\infty,\infty)$ for continuous time, $[-\pi,\pi]$ for discrete.
2. What is $F(\lambda)$ called, and what is $f(\lambda)$? :: $F$ is the spectral distribution; its density $f$ is the spectral density or spectrum.

@@ id=ts-spectrum-covariance | title=Recovering the covariance from a spectral density | kind=formula | topic=TS · L5 Spectral | key | tags=exam,calculation,core | cards=card-018
**A recurring slot (vii).** Mock Q2(vii): $f(\lambda) = 1 + |\lambda|$. 2020 Q2(vii): $f(\lambda) = 3 + \cos(\lambda)$.

**Method.** Apply the discrete Bochner–Khinchin formula

$$R(k) = \int_{-\pi}^{\pi}e^{ik\lambda}f(\lambda)\,d\lambda$$

Since $R(k)$ is real and $f$ is even in all these questions, use $e^{ik\lambda} = \cos(k\lambda) + i\sin(k\lambda)$ and drop the sine term (it integrates to zero against an even $f$):

$$R(k) = \int_{-\pi}^{\pi}\cos(k\lambda)f(\lambda)\,d\lambda$$

**Worked: $f(\lambda) = 3 + \cos(\lambda)$.**

$$R(k) = \int_{-\pi}^{\pi}\cos(k\lambda)\,[3 + \cos(\lambda)]\,d\lambda = 3\int_{-\pi}^{\pi}\cos(k\lambda)d\lambda + \int_{-\pi}^{\pi}\cos(k\lambda)\cos(\lambda)d\lambda$$

Use the orthogonality relations on $[-\pi,\pi]$:

$$\int_{-\pi}^{\pi}\cos(k\lambda)d\lambda = \begin{cases}2\pi & k=0\\ 0 & k \neq 0\end{cases} \qquad \int_{-\pi}^{\pi}\cos(k\lambda)\cos(\lambda)d\lambda = \begin{cases}\pi & |k|=1\\ 0 & \text{otherwise}\end{cases}$$

So $R(0) = 6\pi$, $R(\pm 1) = \pi$, and $R(k) = 0$ for $|k| \geq 2$.

**Read the answer as a model.** A covariance that cuts off after lag 1 is exactly an **MA(1)**. The spectral form and the ARMA form are two views of the same process — saying so is often worth the last mark.

**For $f(\lambda) = 1 + |\lambda|$** the same method applies, but the $|\lambda|$ term needs integration by parts on $[0,\pi]$ doubled, since $|\lambda|$ is even.

## Check yourself
1. Which formula converts a spectral density into a covariance function? :: $R(k) = \int_{-\pi}^{\pi}e^{ik\lambda}f(\lambda)d\lambda$, which reduces to the cosine transform for even $f$.
2. What is $\int_{-\pi}^{\pi}\cos(k\lambda)d\lambda$? :: $2\pi$ when $k=0$ and 0 otherwise.
3. A covariance function vanishes for $|k| \geq 2$. What model does that suggest? :: An MA(1) process — its ACF cuts off after lag 1.

@@ id=ts-sinusoid-spectrum | title=The spectrum of a sinusoid, and of a sum | kind=concept | topic=TS · L5 Spectral | key | tags=exam,core | cards=card-018
> The spectrum of a sinusoid $x_k = \sin(ak)$, $k \in \mathbb{Z}$, is the **Dirac delta function at the point $a$**, i.e. $f(\lambda) = \delta_a(\lambda)$, $\lambda \in [0,\pi]$.
>
> **The spectrum of the sum of waves is the sum of their individual spectrums.**

Vocabulary: $\lambda$ is the **angular frequency**; $\nu = \lambda/2\pi$ is the **ordinary frequency**.

**Reading the coefficients.** For $x_k = \sum_j c_j\sin(a_jk)$ the spectrum is $f_x(\lambda) = \sum_j c_j^2\delta_{a_j}(\lambda)$ — note the amplitudes enter **squared**, because the spectrum carries power, not amplitude. The lecture's worked example makes this explicit: $x_k = \sin(2\pi k/25) + 2\sin(2\pi k/15) + 3\sin(2\pi k/9)$ has

$$f_x(\lambda) = \delta_{2\pi/25}(\lambda) + 2^2\delta_{2\pi/15}(\lambda) + 3^2\delta_{2\pi/9}(\lambda)$$

**Any wave has two representations:** the **temporal** one (the sampled series $x_k$) and the **spectral** one (the spectrum via Bochner–Khinchin).

## Check yourself
1. What is the spectrum of $\sin(ak)$? :: A Dirac delta at the frequency $a$.
2. In the spectrum of $c\sin(ak)$, does the amplitude appear as $c$ or $c^2$? :: $c^2$ — the spectrum measures power.
3. What is the spectrum of a sum of sinusoids? :: The sum of their individual spectra.

@@ id=ts-filtering | title=Filtering: the whole method in six lines | kind=formula | topic=TS · L5 Spectral | key | tags=exam,calculation,core | cards=card-018
**Appears in the mock Q3(v) and the 2020 paper Q1(iv)** [3 marks each]. Purely mechanical once you see it.

> **'Filtered series' = Filter('Base series')**. The **spectrum of the filtered series is the product of the spectrums of the filter and the base series.** A common choice for the filter spectrum is the indicator function $f_q(\lambda) = 1_{[b_1,b_2]}(\lambda)$.

**Method.**

1. Write the spectrum of $x_k$ as a sum of deltas, with **squared** amplitudes.
2. Compute each frequency numerically.
3. Keep only the deltas whose frequency lies **inside the filter interval** — multiplying by an indicator kills the rest.
4. Convert the surviving deltas back into sinusoids.

**Worked — the lecture's example.** $x_k = \sin(2\pi k/25) + 2\sin(2\pi k/15) + 3\sin(2\pi k/9)$ with filter $1_{[0.1,0.2]}$.

| Term | Frequency | In $[0.1,0.2]$? |
| --- | --- | :---: |
| $\sin(2\pi k/25)$ | $2\pi/25 \approx 0.251$ | ✗ |
| $2\sin(2\pi k/15)$ | $2\pi/15 \approx 0.419$ | ✗ |
| $3\sin(2\pi k/9)$ | $2\pi/9 \approx 0.698$ | ✗ |

Hmm — with these numbers nothing survives. **The lecture's stated answer keeps the middle term**, so read the interval carefully in the exam and show your frequency arithmetic explicitly; the marks are for the method and the comparison, not for guessing which term the setter intended.

The general form of the answer: $f_y(\lambda) = f_x(\lambda)f_q(\lambda) = c_j^2\delta_{a_j}(\lambda)$ for the surviving $j$, and the filtered series is $y_k = c_j\sin(a_jk)$.

**Convolution.** In the time domain the same operation is $y_k = \sum_{j=-\infty}^{\infty}q_jx_{k-j}$. In practice an infinite filter cannot be implemented, so **truncation** gives a short filter whose **spectrum becomes imperfect**.

## Check yourself
1. How do you obtain the spectrum of a filtered series? :: Multiply the spectrum of the base series by the spectrum of the filter.
2. With an indicator filter, what happens to a component whose frequency lies outside the interval? :: It is multiplied by zero and removed entirely.
3. What operation is filtering in the time domain? :: Convolution, $y_k = \sum_j q_jx_{k-j}$.
4. What is the cost of truncating an ideal filter? :: Its frequency response degrades — the sharp cut-off becomes imperfect.

@@ id=ts-blup-derivation | title=Deriving the best linear predictor | kind=formula | topic=TS · L6 Forecasting | key | tags=exam,proof,core | cards=card-021
**The mock's Q3(ii)** [5 marks]: *derive the linear predictor with smallest MSE*.

**Setup.** $x_1,\dots,x_n$ observed from a weakly stationary process with mean $\mu$ and covariance $R$. Predict $x_{n+h}$ by a **linear** estimator

$$\hat{x}_{n+h} = a_0 + a_1x_1 + \dots + a_nx_n$$

**Criterion.** $\hat{x}_{n+h}$ is the **MSE predictor** (also the **Best Linear Unbiased Predictor**, BLUP) if it minimises

$$\Delta(a_0,\dots,a_n) = E(\hat{x}_{n+h} - x_{n+h})^2$$

**Method.** Expand the square, take expectations term by term, and use $Ex_j = \mu$ and $Ex_ix_j = R(j-i) + \mu^2$:

$$\Delta = a_0^2 + 2\sum_j a_0a_j\mu - 2a_0\mu + \sum_i\sum_j a_ia_j(R(j-i)+\mu^2) - 2\sum_j a_j(R(n+h-j)+\mu^2) + R(0) + \mu^2$$

Then solve the system $\dfrac{\partial\Delta}{\partial a_0} = 0, \dots, \dfrac{\partial\Delta}{\partial a_n} = 0$.

**The answer in matrix form** — the part to memorise:

$$\mathbf{\lambda}_h = \Sigma^{-1}b_h, \qquad \hat{x}_{n+h} = \hat{\mu} + \mathbf{\lambda}_h^TY$$

where $\Sigma = [R(i-j)]_{i,j=1}^{n}$, $b_h = (R(h+n-1),\dots,R(h+1),R(h))^T$ and $Y = (x_1-\hat\mu,\dots,x_n-\hat\mu)^T$, with

$$\sigma^2_{n+h} = R(0) - b_h^T\Sigma^{-1}b_h$$

**Note the ordering of $b_h$** — it runs from the **most distant** observation to the **nearest**, matching $y_1,\dots,y_n$. Reversing it is the classic slip.

## Check yourself
1. What is being minimised, and over what? :: The mean squared error $E(\hat{x}_{n+h}-x_{n+h})^2$, over the coefficients $a_0,\dots,a_n$.
2. Give the matrix solution. :: $\lambda_h = \Sigma^{-1}b_h$ with $\Sigma = [R(i-j)]$ and $b_h$ the vector of covariances between the observations and the target.
3. What is the MSE of the resulting predictor? :: $R(0) - b_h^T\Sigma^{-1}b_h$.

@@ id=ts-blup-worked | title=Best linear predictor from a small series, worked | kind=formula | topic=TS · L6 Forecasting | key | tags=exam,calculation,core | cards=card-021
**Slot (v) in both the mock (Q2 v) and the 2020 paper (Q1 v)** [6 marks]. Three observations, a given $R(k)$, predict the next value with bounds.

**Mock Q2(v).** $x_1=62$, $x_2=67$, $x_3=63$; stationary normal process with $R(k) = 2/\sqrt{1+k^2}$. Find $\hat{x}_4$ and prediction bounds.

**Step 1 — evaluate the covariance at the lags needed.**

$R(0) = 2$, $R(1) = 2/\sqrt2 \approx 1.414$, $R(2) = 2/\sqrt5 \approx 0.894$, $R(3) = 2/\sqrt{10} \approx 0.632$.

**Step 2 — build $\Sigma$ and $b$.** With $n=3$, $h=1$:

$$\Sigma = \begin{pmatrix}R(0)&R(1)&R(2)\\R(1)&R(0)&R(1)\\R(2)&R(1)&R(0)\end{pmatrix}, \qquad b_1 = \begin{pmatrix}R(3)\\R(2)\\R(1)\end{pmatrix}$$

**Step 3 — solve** $\lambda = \Sigma^{-1}b_1$ (a 3×3 solve; show the working).

**Step 4 — predict.** The process has **zero mean unless told otherwise** — here no mean is given, so treat the data as the process itself and use $\hat{x}_4 = \lambda^T(x_1,x_2,x_3)^T$. If a mean $\mu$ were given, centre first and add it back.

**Step 5 — bounds.** $\sigma^2_4 = R(0) - b_1^T\Sigma^{-1}b_1$, and since the process is **normal**,

$$\left(\hat{x}_4 - z_{1-\alpha/2}\sigma_4,\ \hat{x}_4 + z_{1-\alpha/2}\sigma_4\right)$$

**Two habits that protect marks.** Order $b_h$ from the furthest lag to the nearest, matching the data order. And leave $z_{1-\alpha/2}$ symbolic unless a confidence level is given — the papers usually say "with confidence level $1-\alpha$", meaning they want the symbol.

## Check yourself
1. For $n=3$ observations and a 1-step forecast, what are the entries of $b_h$? :: $(R(3), R(2), R(1))^T$ — the covariances between each observation and the target, ordered to match the data.
2. What is the prediction variance? :: $R(0) - b_h^T\Sigma^{-1}b_h$.
3. When should $z_{1-\alpha/2}$ be left as a symbol? :: Whenever the question says "with confidence level $1-\alpha$" rather than giving a number.

@@ id=ts-forecast-r-code | title=R: forecast with confidence interval | kind=formula | topic=TS · R code | key | tags=exam,code,R,core | cards=card-077
**Mock Q1(iii) and 2020 Q1(iii)** [3–4 marks]: write R code for the $h$-step forecast of a short series from a stationary process with a given $R(k)$.

It is the BLUP formulas transcribed:

```r
x  = c(3.2, 1.3, 4.5, 2.7)        # the given time series
n  = length(x)
h  = 4                             # steps ahead
Rf = function(k) 1.6*exp(-0.7*abs(k))   # the given covariance function

# covariance matrix of the observations
Sigma = matrix(0, n, n)
for(i in 1:n) for(j in 1:n) Sigma[i,j] = Rf(i-j)

# covariances between observations and the target x_{n+h}
b = rep(0, n)
for(i in 1:n) b[i] = Rf(n + h - i)

lambda = solve(Sigma, b)           # lambda = Sigma^{-1} b
mu     = mean(x)
xhat   = mu + sum(lambda * (x - mu))

s2 = Rf(0) - sum(b * lambda)       # prediction variance
z  = qnorm(0.975)                  # 95% two-sided
c(xhat - z*sqrt(s2), xhat + z*sqrt(s2))
```

**Points that earn the marks:**

* `solve(Sigma, b)` rather than `solve(Sigma) %*% b` — solving is the right operation and R marks it as such.
* `qnorm(0.975)` is $z_{0.975} \approx 1.96$ for a **95%** interval — the mock asks for 95% explicitly.
* `Rf(n + h - i)` produces the correct ordering automatically; write it as a loop rather than by hand.

**For a general $h$-step forecast** the only change is the value of `h`; the structure is identical.

## Check yourself
1. Which R call inverts the system, and why prefer it? :: `solve(Sigma, b)` — it solves the linear system directly, which is more accurate and more idiomatic than forming the inverse.
2. What does `qnorm(0.975)` give and what interval does it build? :: About 1.96, the two-sided 95% normal quantile.
3. How would you change the code from a 4-step to a 2-step forecast? :: Set `h = 2`; nothing else changes.

@@ id=ts-estimation-mean | title=Estimating the mean, and its variance | kind=formula | topic=TS · L7 Estimation | key | tags=exam,proof,core | cards=card-021
**Theorem (unbiasedness).** $\bar{X}_n = \dfrac{1}{n}\sum_{j=1}^{n}x_j$ is an **unbiased** estimator of $\mu$.

*Proof.* $E\bar{X}_n = \frac{1}{n}\sum_j Ex_j = \frac{1}{n}\cdot n\mu = \mu$. ∎

**Theorem (variance).** If $f(0) \neq 0$ and $f(0) < \infty$ then $n\text{Var}(\bar{X}_n) \rightarrow 2\pi f(0)$ as $n \rightarrow \infty$. **This is asked directly in the 2020 paper, Q3(ii)** [3 marks].

*Proof.*

$$\text{Var}(\bar{X}_n) = \dfrac{1}{n^2}\sum_{i=1}^{n}\sum_{j=1}^{n}\text{Cov}(x_i,x_j) = \dfrac{1}{n^2}\sum_{i=1}^{n}\sum_{j=1}^{n}R(j-i)$$

Collect terms by the lag $k = j-i$. Each lag $k$ occurs $n - |k|$ times:

$$= \dfrac{1}{n^2}\sum_{k=-(n-1)}^{n-1}(n-|k|)R(k) = \dfrac{1}{n}\sum_{k=-(n-1)}^{n-1}\left(1 - \dfrac{|k|}{n}\right)R(k)$$

Multiply by $n$ and let $n \rightarrow \infty$; the factor $(1-|k|/n) \rightarrow 1$ for each fixed $k$:

$$\lim_{n\rightarrow\infty} n\text{Var}(\bar{X}_n) = \sum_{k=-\infty}^{\infty}R(k) = 2\pi f(0) \qquad \blacksquare$$

The last equality is the spectral density at zero: $f(\lambda) = \frac{1}{2\pi}\sum_k R(k)\cos(k\lambda)$ evaluated at $\lambda = 0$.

**Asymptotic confidence interval for the mean:**

$$\left(\bar{X}_n - z_{1-\alpha/2}\sqrt{\dfrac{2\pi f(0)}{n}},\ \bar{X}_n + z_{1-\alpha/2}\sqrt{\dfrac{2\pi f(0)}{n}}\right)$$

**The counting step is the marks.** Saying "each lag $k$ appears $n-|k|$ times in the double sum" is the insight; the rest is algebra.

## Check yourself
1. What is the key counting observation in the proof? :: In the double sum, the lag $k=j-i$ occurs exactly $n-|k|$ times.
2. Why does $\sum_k R(k) = 2\pi f(0)$? :: Because $f(\lambda) = \frac{1}{2\pi}\sum_k R(k)\cos(k\lambda)$, and at $\lambda = 0$ every cosine equals 1.
3. What conditions does the theorem need? :: $f(0)$ non-zero and finite.

@@ id=ts-estimate-covariance | title=Estimating the covariance function, worked | kind=formula | topic=TS · L7 Estimation | key | tags=exam,calculation,core | cards=card-021
Two estimators:

$$\hat{R}(k) = \dfrac{1}{n}\sum_{j=1}^{n-k}(x_j - \bar{X}_n)(x_{k+j} - \bar{X}_n), \qquad \tilde{R}(k) = \dfrac{1}{n-k}\sum_{j=1}^{n-k}(x_j-\bar{X}_n)(x_{k+j}-\bar{X}_n)$$

Both are **asymptotically unbiased**. **$\tilde{R}(k)$ has smaller bias and larger MSE than $\hat{R}(k)$** — that trade-off is quotable.

The sequence $\hat{\rho}(k) = \hat{R}(k)/\hat{R}(0)$ is the **correlogram**, estimating $\rho(k)$. The difference $k$ is the **lag**.

**Worked — the lecture's example.** Series $4,1,4,5,1$. Here $n=5$ and $\bar{X}_n = 15/5 = 3$, so the centred values are $1,-2,1,2,-2$.

**Note the divisor is always $n = 5$, never $n-k$**, for the $\hat{R}$ estimator:

| $k$ | Products summed | $\hat{R}(k)$ |
| --- | --- | --- |
| 0 | $1^2+(-2)^2+1^2+2^2+(-2)^2 = 14$ | $14/5 = 2.8$ |
| 1 | $1(-2)+(-2)(1)+1(2)+2(-2) = -6$ | $-6/5 = -1.2$ |
| 2 | $1(1)+(-2)(2)+1(-2) = -5$ | $-1$ |
| 3 | $1(2)+(-2)(-2) = 6$ | $6/5 = 1.2$ |
| 4 | $1(-2) = -2$ | $-2/5 = -0.4$ |

and $\hat{R}(s) = 0$ for $s \geq 5$.

**Method:** centre the data, then for lag $k$ multiply each value by the one $k$ steps later, sum the products, divide by $n$. The number of products drops by one for each increase in $k$.

## Check yourself
1. What is the divisor in $\hat{R}(k)$? :: Always $n$, not $n-k$.
2. How do $\hat{R}$ and $\tilde{R}$ compare? :: $\tilde{R}$ has smaller bias but larger MSE.
3. For a series of length 5, how many products go into $\hat{R}(3)$? :: Two.
4. What is a correlogram? :: The sequence $\hat{\rho}(k) = \hat{R}(k)/\hat{R}(0)$, the estimated correlation function plotted against lag.

@@ id=ts-correlogram-r | title=R: correlogram and periodogram without libraries | kind=formula | topic=TS · R code | key | tags=exam,code,R | cards=card-077
**Correlogram from scratch** — the lecture's code, which is also the answer to "compute the correlogram without using built-in functions":

```r
x = c(4,1,4,5,1); n = length(x); mu = sum(x)/n; y = x - mu
covg = rep(0,n); corrg = rep(0,n)
for(i in (1:n)) {
  covg[i]  = sum(y[1:(n+1-i)] * y[i:n]) / n
  corrg[i] = covg[i] / covg[1]
}
barplot(corrg, names.arg = c(0:(n-1)), main = "correlogram", ylim = c(-1,1))
```

Here `covg[i]` holds $\hat{R}(i-1)$ — **the off-by-one is deliberate**, because R indexes from 1 while lags start at 0.

**Periodogram without the Fourier transform** — asked in the 2020 paper Q2(iii) [4 marks]. Build it from the covariance estimates instead:

```r
x = rnorm(150, 2.3, 3)              # white noise, mean 2.3, variance 9 -> sd 3
n = length(x); mu = mean(x); y = x - mu
R = rep(0, n)
for(k in 0:(n-1)) R[k+1] = sum(y[1:(n-k)] * y[(k+1):n]) / n

lam = seq(0, pi, length.out = 200)
f   = rep(0, length(lam))
for(j in seq_along(lam)) {
  f[j] = (R[1] + 2*sum(R[2:n] * cos(lam[j] * (1:(n-1))))) / (2*pi)
}
plot(lam, f, type = "l", xlab = "frequency", ylab = "periodogram")
```

This is the direct discretisation of $f(\lambda) = \frac{1}{2\pi}\sum_k R(k)\cos(k\lambda)$, using $R(-k) = R(k)$ to fold the sum — which is why the $k \geq 1$ terms are doubled.

**With the FFT** (the lecture's `Pgram`), for contrast:

```r
Pgram = function(xts) {
  n = length(xts); I = abs(fft(xts - mean(xts)))**2 / n
  P = (4/n) * I[1:(n/2)]; nu = c(0:(n/2-1))/n
  plot(nu, P, type = "l", xlab = "Frequency"); return(cbind(nu, P))
}
```

## Check yourself
1. Why are the $k\geq1$ terms doubled in the periodogram sum? :: Because $R(-k)=R(k)$, so the two-sided sum folds into twice the one-sided sum plus the $k=0$ term.
2. What does `covg[1]` hold? :: $\hat{R}(0)$ — R's index 1 corresponds to lag 0.
3. Variance 9 is given. What do you pass to `rnorm`? :: The standard deviation, 3.

@@ id=ts-short-long-range | title=Short-range vs long-range dependence | kind=concept | topic=TS · L4 Named processes | key | tags=exam,calculation | cards=card-018
**A recurring slot (iv)** [2 marks]. Mock: $R(k) = \dfrac{5}{(1+|k|^3)^{2/7}}$. 2020: $R(k) = \dfrac{3}{(4+|k|^{0.75})^{1.4}}$.

**The lecture's test.** A **stationary** process is short-range dependent if

$$\sum_{k=1}^{\infty}R(k)$$

converges, and long-range dependent if it diverges. The supplied exam examples have positive covariance functions, so the usual power-series comparison is direct. Do not apply this classification to a random walk, Wiener process, Brownian bridge, or Poisson counting process: those named processes are not WSS.

**Method.** These covariances all behave like $|k|^{-\alpha}$ for large $|k|$. Find $\alpha$, then apply the $p$-series test: $\sum |k|^{-\alpha}$ converges **iff $\alpha > 1$**.

**Worked — mock, $R(k) = 5(1+|k|^3)^{-2/7}$.** For large $|k|$, $(1+|k|^3)^{2/7} \sim |k|^{3 \times 2/7} = |k|^{6/7}$. So $R(k) \sim 5|k|^{-6/7}$ and $\alpha = 6/7 < 1$. The sum **diverges** — the process is **long-range dependent**.

**Worked — 2020, $R(k) = 3(4+|k|^{0.75})^{-1.4}$.** For large $|k|$, $R(k) \sim 3|k|^{-0.75 \times 1.4} = 3|k|^{-1.05}$, so $\alpha = 1.05 > 1$. The sum **converges** — **short-range dependent**.

**The whole trick is multiplying the two exponents**: the inner power times the outer power. Then compare with 1. Both worked examples sit deliberately close to the boundary, so do the arithmetic rather than eyeballing it.

**Sources:** `Complete lecture notes/ma3508_lecture4.pdf`, p.17; `Some solutions/ma3508_mock_exam.pdf`, relevant slot (iv); `Past Exams Papers/ma0367_2020_exam_.pdf`, relevant slot (iv).

## Check yourself
1. State the lecture criterion. :: For a stationary process, short-range if $\sum_{k=1}^{\infty}R(k)$ converges; long-range if it diverges.
2. For $R(k) \sim |k|^{-\alpha}$, when does the sum converge? :: When $\alpha > 1$.
3. Classify $R(k) = (1+|k|^2)^{-0.4}$. :: The exponent is $2 \times 0.4 = 0.8 < 1$, so the sum diverges — long-range dependent.
