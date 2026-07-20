@@ id=s3-linear-model | title=What a linear model is | kind=concept | topic=S3 · Linear regression | key | tags=regression,formula,exam
**A linear model is a sum of weighted variables that predicts a target output value given an input data instance.**

Univariate:

$$\hat{y} = wx + b$$

where $w$ is the slope/gradient and $b$ the intercept.

General form, $n$ features:

$$\hat{y} = w_1 x_1 + w_2 x_2 + \dots + w_n x_n + b = \mathbf{w}^T\mathbf{x} + b$$

$w_1 \dots w_n$ are the **feature weights**; $b$ is the **bias**.

**Linear regression is finding a linear model for a given dataset** — that is, finding the $\mathbf{w}$ and $b$ that fit best.

## Check yourself
1. Name the two parameter groups in a linear model and what each does. :: Feature weights $\mathbf{w}$, one per feature, giving each feature's contribution; and the bias/intercept $b$, the output when all features are zero.

@@ id=s3-ols | title=Least squares and the loss function | kind=concept | topic=S3 · Linear regression | key | tags=regression,formula,exam
Ordinary Least Squares finds $\mathbf{w}$ and $b$ that **minimise the mean squared error** — the average of the sum of squared differences between predicted target $\hat{y}$ and actual target $y$:

$$L(\mathbf{w}, b) = \dfrac{1}{N}\sum_{i=1}^{N}(\hat{y}_i - y_i)^2 = \dfrac{1}{N}\sum_{i=1}^{N}(\mathbf{w}^T\mathbf{x}_i + b - y_i)^2$$

**Vocabulary, all four names for the same thing:** $L$ is the **objective function**, also called the **loss function**, **cost function**, or **error function**.

> Finding the optimal model parameters on a given dataset is called **training** (aka **learning**).

That sentence is the definition of training for the whole module.

## Check yourself
1. Give four names for $L$. :: Objective function, loss function, cost function, error function.
2. Define "training" in one sentence. :: Finding the model parameters that minimise the loss function on a given dataset.

@@ id=s3-two-training-ways | title=Two ways to train: closed form vs gradient descent | kind=cheatsheet | topic=S3 · Model training | key | tags=training,exam
| | Closed form (Normal Equation) | Gradient descent |
| --- | --- | --- |
| Nature | direct mathematical derivation | iterative optimisation |
| Result | **exact** solution | **approximate** solution |
| Cost | matrix inverse, $O(n^{2.4})$ to $O(n^3)$ in the number of **features** | scales well with features |
| Breaks down when | $n$ (features) is large | needs tuning: learning rate, iterations |

**Normal equation:**

$$\mathbf{w} = (\mathbf{X}^T\mathbf{X})^{-1}\mathbf{X}^T\mathbf{y}$$

obtained by setting the gradient of $L(\mathbf{w})$ to zero. Each row of $\mathbf{X}$ is a point; $\mathbf{y}$ is the column vector of targets.

> Training a linear regression model when there are hundreds of thousands of features is much faster using gradient descent than the normal equation.

## Check yourself
1. Which is exact and which is approximate? :: Closed form is exact; gradient descent is approximate.
2. What makes the normal equation slow, and in what quantity? :: The matrix inverse, roughly $O(n^{2.4})$–$O(n^3)$ in the number of **features** — not the number of rows.

@@ id=s3-gradient-descent | title=Gradient descent, step by step | kind=concept | topic=S3 · Model training | key | tags=training,exam,formula
**Gradient descent tweaks parameters iteratively in order to minimise a cost function.**

```text
Initialise parameters w with random values
Repeat:
    calculate the current value of the loss function
    calculate the gradient of the loss at the current step
    update:  w ← w − η ∇L
until the termination condition is satisfied
```

$\eta$ is the **learning rate**, determining the step size. For linear regression the gradient is

$$\nabla L = \dfrac{2}{N}\mathbf{X}^T(\mathbf{X}\mathbf{w} - \mathbf{y})$$

Two properties worth quoting:

* The MSE loss of linear regression is **convex**, so it has no local minimum — gradient descent is **guaranteed to approach arbitrarily close to the global minimum**.
* **A round of training over the whole training set is called an epoch.**

## Check yourself
1. Why is gradient descent guaranteed to find the global optimum for linear regression? :: Its MSE loss is convex, so there are no local minima to get stuck in.
2. Define an epoch. :: One round of training over the whole training set.
3. Write the parameter update rule. :: $w \leftarrow w - \eta \nabla L$.

@@ id=s3-learning-rate | title=Learning rate and learning schedules | kind=concept | topic=S3 · Model training | key | tags=training,exam,debugging
| Learning rate | Symptom |
| --- | --- |
| **Too small** | takes a long time to reach the solution |
| **Too big** | may not converge — overshoots |

**Learning schedule:** use a function to update the learning rate — start large and gradually decrease it at each step $t$:

$$\eta(t) = \dfrac{t_0}{t + t_1}$$

Lab 3 uses exactly this with `t0, t1 = 5, 50`, giving an initial learning rate of $5/50 = 0.1$.

The lab plots three rates side by side — $\eta = 0.02$ (too slow, still climbing after 1000 steps), $\eta = 0.1$ (converges cleanly), $\eta = 0.5$ (diverges wildly). Recognising those three pictures is exam-ready knowledge.

## Check yourself
1. Your loss increases every iteration. What is the first hyperparameter to change and in which direction? :: The learning rate — reduce it. Increasing loss means the steps are overshooting the minimum.
2. What is a learning schedule for? :: To take large steps early for fast progress, then smaller steps later for a precise landing near the minimum.

@@ id=s3-gd-normalise | title=Gradient descent needs normalised features | kind=traps | topic=S3 · Model training | key | tags=scaling,training,exam
> When using gradient descent, you should ensure that all features have a similar scale.

If one feature ranges over $[0, 1]$ and another over $[0, 100000]$, the loss surface becomes a long narrow valley. Gradient descent then zig-zags across it and converges very slowly — or not at all with a rate large enough to make progress on the flat direction.

Same two options as Session 2: min-max to $[-1,1]$ or $[0,1]$, or z-score to $N(0,1)$.

**This is why the leakage rule and the convergence rule point the same way:** scale inside a Pipeline, fitted on train only.

@@ id=s3-gd-early-stopping | title=Early stopping | kind=concept | topic=S3 · Model training | key | tags=training,overfitting,exam
Training can be terminated when:

* the loss falls below a preset value, or
* the number of repetitions reaches a maximum, or
* — the important one — **using a validation set, stop when performance on the validation set starts decreasing, or after no improvement for a set number of iterations.**

```text
Error
  │        under-training │ over-training
  │  ╲                    │        ╱ validation error
  │   ╲___                │     ╱
  │       ╲___            │  ╱
  │           ╲______________╱      ← optimal time: stop here
  │                    ╲_________   training error keeps falling
  └────────────────────────────────── training time
```

The gap between the two curves is the **generalisation gap**. Training error falling while validation error rises *is* overfitting, watched live.

## Check yourself
1. Which curve do you watch to decide when to stop, and what are you looking for? :: The validation error — stop when it starts increasing, even though training error is still falling.
2. What is the gap between the training and validation curves called? :: The generalisation gap.

@@ id=s3-gd-variants | title=Batch, stochastic and mini-batch gradient descent | kind=cheatsheet | topic=S3 · Model training | key | tags=training,exam
Three ways to compute the gradient, differing only in **how much data each update uses**.

| Variant | Data per step | Update frequency | Character |
| --- | --- | --- | --- |
| **Batch GD** | the whole training set | once per epoch | smooth path; **slow when the training set is large** |
| **Stochastic GD** | one random instance | every instance | **frequent updating**; noisy path |
| **Mini-batch GD** | a small random set of instances | every mini-batch | the practical middle ground |

All three use the same update rule $w \leftarrow w - \eta \nabla L$. Only the data used to estimate $\nabla L$ changes.

```python
from sklearn.linear_model import SGDRegressor
sgd_reg = SGDRegressor(max_iter=50, tol=None, penalty=None,
                       eta0=0.1, random_state=42)
sgd_reg.fit(X, y.ravel())        # note .ravel() — SGDRegressor wants 1-D y
```

## Check yourself
1. What exactly differs between the three variants? :: Only how many training instances are used to compute the gradient at each update — all of them, one, or a small random subset.
2. Why does `SGDRegressor.fit` need `y.ravel()`? :: It expects a 1-D target array; a column vector of shape (n, 1) triggers a warning or error.

@@ id=s3-normal-equation-code | title=Normal equation by hand in numpy | kind=cheatsheet | topic=S3 · Code recipes | tags=code,numpy,lab
Lab 3 builds it explicitly before showing the sklearn version — worth being able to read.

```python
X = 2 * np.random.rand(100, 1)               # 100 points in [0, 2)
y = 4 + 3 * X + np.random.randn(100, 1)      # true line y = 4 + 3x plus N(0,1) noise

X_b = np.c_[np.ones((100, 1)), X]            # prepend x0 = 1 so b becomes w0
w_best = np.linalg.inv(X_b.T.dot(X_b)).dot(X_b.T).dot(y)

X_new   = np.array([[0], [2]])
X_new_b = np.c_[np.ones((2, 1)), X_new]
y_predict = X_new_b.dot(w_best)
```

**The `np.c_[np.ones(...), X]` trick is the examinable part.** Adding a constant column of 1s folds the intercept $b$ into the weight vector as $w_0$, so a single matrix expression handles both. Note the true parameters are 4 and 3, and `w_best` should come out close to them — a built-in sanity check.

Compare with sklearn, which keeps the intercept separate and so takes plain `X`:

```python
from sklearn.linear_model import LinearRegression

lin_reg = LinearRegression()
lin_reg.fit(X, y)                    # X, not X_b
lin_reg.intercept_, lin_reg.coef_    # w0 ; w1...wn
lin_reg.predict(X_new)
```

## Check yourself
1. Why add a column of ones to X? :: To fold the intercept into the weight vector as $w_0$, so one matrix product covers both weights and bias.
2. Why does `LinearRegression.fit` take `X` rather than `X_b`? :: It handles the intercept as a separate parameter internally, exposed afterwards as `intercept_`.

@@ id=s3-bgd-code | title=Batch gradient descent in eight lines | kind=cheatsheet | topic=S3 · Code recipes | key | tags=code,numpy,lab,exam
```python
eta = 0.1              # learning rate
n_iterations = 1000
N = 100                # number of data points
w = np.random.randn(2, 1)                    # random initialisation

for iteration in range(n_iterations):
    gradients = 2/N * X_b.T.dot(X_b.dot(w) - y)
    w = w - eta * gradients
```

Read the gradient line right to left: `X_b.dot(w)` is the prediction, minus `y` is the error, `X_b.T.dot(...)` projects the error back onto each feature, `2/N` is the constant from differentiating the mean of squares.

The stochastic version changes only which rows are used:

```python
random_index = np.random.randint(N)
xi = X_b[random_index:random_index+1]        # slice keeps it 2-D
yi = y[random_index:random_index+1]
gradients = 2 * xi.T.dot(xi.dot(w) - yi)     # no 1/N — it is one point
eta = learning_schedule(epoch * N + i)
w = w - eta * gradients
```

**Note `X_b[i:i+1]` rather than `X_b[i]`** — the slice preserves the 2-D shape that the matrix algebra needs. `X_b[i]` gives a 1-D array and the dot products silently produce the wrong shape.

## Check yourself
1. Why is the SGD gradient missing the `1/N` factor? :: It is computed from a single instance, so there is nothing to average over.
2. Why `X_b[i:i+1]` instead of `X_b[i]`? :: Slicing keeps the row 2-D; plain indexing collapses it to 1-D and breaks the matrix products.

@@ id=s3-polynomial | title=Polynomial regression | kind=concept | topic=S3 · Polynomial | key | tags=regression,exam
**Add powers of each feature (and products of features) as new features, then train a linear model on this extended set.**

For a 2nd-degree univariate model:

$$y = w_0 + w_1 x_1 + w_2 x_1^2$$

$x_1^2$ is simply treated as **a new feature**. Every polynomial term becomes a new feature in an ordinary linear regression — which means **the training methods for ordinary linear regression work unchanged**.

That is the whole idea, and the reason it is examinable: *polynomial regression is still a linear model* — linear in the parameters, not in the inputs.

```python
from sklearn.preprocessing import PolynomialFeatures
PolynomialFeatures(degree=3)      # as used in the Lab 4 SVM pipeline
```

The open question the slides pose: **which degree?** Too low underfits, too high overfits — which is exactly the bridge into generalisation.

## Check yourself
1. In what sense is polynomial regression still linear? :: Linear in the parameters. The powers are precomputed features, so the model remains a weighted sum.
2. What happens as the polynomial degree increases? :: Capacity increases — the model moves from underfitting through a good fit to overfitting.

@@ id=s3-generalisation | title=Generalisation, overfitting, underfitting | kind=concept | topic=S3 · Generalisation | key | tags=exam,core | cards=card-014
**Generalisation is the ability to perform well on previously unseen data.**

Performance depends on two abilities:

1. **Make the training error small.**
2. **Make the gap between training and test error small.**

Those two map exactly onto the two failure modes:

| | Definition | Which ability failed |
| --- | --- | --- |
| **Underfitting** | the model *is not able to obtain a sufficiently low error on the training set* | ability 1 |
| **Overfitting** | *the gap between training error and test error is too large* | ability 2 |

```text
Error │
      │ ╲  underfitting  │  overfitting  ╱ test error
      │  ╲               │            ╱
      │   ╲______________│_________╱
      │        ╲_________________________ training error
      └──────────────────────────────────► model complexity
                    optimal complexity
```

**Learn the definitions precisely.** Overfitting is not "training error is low" — it is the *gap* being large. Underfitting is not "test error is high" — it is *training* error being high.

## Check yourself
1. Define overfitting in the module's own terms. :: The gap between training error and test error is too large.
2. Define underfitting. :: The model cannot obtain a sufficiently low error even on the training set.
3. Training error 0.02, test error 0.03. Which problem do you have? :: Neither — low training error and a small gap. This is a good model.
4. Training error 0.31, test error 0.33. Which problem? :: Underfitting. The gap is small but training error itself is high, so the model lacks capacity.

@@ id=s3-overfitting-fixes | title=Overfitting: symptom and four fixes | kind=cheatsheet | topic=S3 · Generalisation | key | tags=exam,recall | cards=card-014
**Symptom:** high accuracy on training data, low accuracy on unseen data.

**Ways to deal with it:**

1. **regularisation**
2. **more training data**
3. **dimensionality reduction**
4. **dataset shift → model adaptation**

Worth having all four ready — an exam question asking "how would you address overfitting here?" wants more than "use regularisation".

## Check yourself
1. List four ways to deal with overfitting. :: Regularisation, more training data, dimensionality reduction, and model adaptation in response to dataset shift.

@@ id=s3-regularisation | title=What regularisation is | kind=concept | topic=S3 · Regularisation | key | tags=exam,core
The definition to reproduce exactly:

> **Regularisation is any modification to a learning algorithm that is intended to reduce its generalisation error but not its training error.**

Two supporting statements:

* It **prevents overfitting by restricting the model**, typically reducing its complexity.
* The common mechanism is **adding a penalty term to the original loss function**, with respect to the model parameters.

The "but not its training error" clause is the subtle part. Regularisation is *expected* to make training error slightly worse. If a change improves training error, it is not regularisation.

$\ell_p$ norm of a vector: $\|\mathbf{w}\|_p = \left(\sum_{i=1}^{n}|w_i|^p\right)^{1/p}$

## Check yourself
1. State the definition of regularisation. :: Any modification to a learning algorithm intended to reduce generalisation error but not training error.
2. Why does the definition say "but not its training error"? :: Regularisation constrains the model, so it typically fits the training data slightly worse. The gain is on unseen data.

@@ id=s3-ridge-lasso-elastic | title=Ridge, LASSO and elastic net | kind=cheatsheet | topic=S3 · Regularisation | key | tags=exam,formula,regression | cards=card-014
All three add a penalty to the plain OLS loss. Only the penalty differs.

**Ridge** — adds an **L2** (Euclidean norm) penalty:

$$L = \dfrac{1}{N}\sum_{i=1}^{N}(\hat{y}_i - y_i)^2 + \alpha\sum_{j=1}^{n} w_j^2$$

**LASSO** — least absolute shrinkage and selection operator — adds an **L1** (absolute value) penalty:

$$L = \dfrac{1}{N}\sum_{i=1}^{N}(\hat{y}_i - y_i)^2 + \alpha\sum_{j=1}^{n} |w_j|$$

**Elastic net** — both:

$$L = \dfrac{1}{N}\sum(\hat{y}_i - y_i)^2 + \alpha r\sum|w_j| + \alpha\dfrac{(1-r)}{2}\sum w_j^2$$

where $r \in [0,1]$ is the **L1 ratio**: $r = 0$ gives Ridge, $r = 1$ gives LASSO.

| | Penalty | Key effect |
| --- | --- | --- |
| Ridge | L2 | penalises **large variations** in $w$; shrinks weights toward zero but not to zero |
| LASSO | L1 | **sets weights to exactly zero** for the least influential variables — a **sparse solution**, i.e. a kind of feature selection |
| Elastic net | both | between the two; **two** hyperparameters, $\alpha$ and $r$ |

$\alpha > 0$ controls the amount of regularisation, default 1.0. **Larger $\alpha$ means stronger regularisation.**

> This kind of parameter is called a **hyperparameter**, which needs to be set by users before the training process.

**Prediction is identical for all of them** — and to plain linear regression: $\hat{y} = \mathbf{w}^T\mathbf{x}$. Regularisation changes training, not the prediction formula.

## Check yourself
1. Which penalty produces a sparse solution and why does that amount to feature selection? :: L1 (LASSO). It drives the least influential coefficients to exactly zero, so those features drop out of the model.
2. What does $r = 0$ make elastic net equivalent to? :: Ridge regression.
3. Does regularisation change how you predict from a trained model? :: No. Prediction is $\hat{y} = \mathbf{w}^T\mathbf{x}$ in every case; only the fitted $\mathbf{w}$ differs.
4. Which direction of $\alpha$ is more regularisation? :: Larger.

@@ id=s3-which-regression | title=Which regression model? | kind=cheatsheet | topic=S3 · Regularisation | key | tags=exam,recall | cards=card-014
The session's own decision rules, and a likely exam question:

| Situation | Choice |
| --- | --- |
| All features are useful | **Ridge** |
| You suspect some/many features are not useful | **LASSO** — it can eliminate them |
| No intuition about feature usefulness | **Elastic net** — but 2 hyperparameters, $\alpha$ and $r$, to decide |
| Data has non-linear characteristics | introduce **polynomial terms** |

And the blunt overall guidance:

> Generally models incorporating regularization achieve better performance, so **plain linear regression (no regularisation) should be avoided**.

Model should have appropriate **capacity** to approximate the data; regularisation is an effective way to control model complexity.

## Check yourself
1. You have 200 features and suspect most are noise. Which regularised model, and why? :: LASSO — its L1 penalty zeroes out uninformative coefficients, performing feature selection.
2. What does the module say about using plain unregularised linear regression? :: Avoid it; regularised models generally perform better.

@@ id=s3-ridge-lasso-code | title=Regularised models in sklearn | kind=cheatsheet | topic=S3 · Code recipes | key | tags=code,sklearn,exam
```python
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet

Ridge(alpha=1.0)                          # L2
Lasso(alpha=0.1)                          # L1 — sparse
ElasticNet(alpha=0.1, l1_ratio=0.5)       # both; l1_ratio is r
```

**Always scale before a regularised model.** The penalty $\sum w_j^2$ treats all coefficients alike, so a feature measured in thousands gets an unfairly small coefficient and an unfairly small penalty. Unscaled regularisation quietly penalises features by their units.

```python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

model = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
```

Note the naming trap: the **class** is `Lasso`, the **method** is LASSO. And `alpha` in sklearn is the same $\alpha$ as the slides — but in `SGDRegressor` the regularisation strength is also `alpha` while `eta0` is the learning rate. Different parameters, similar names.

## Check yourself
1. Why must features be scaled before Ridge or LASSO? :: The penalty is applied uniformly to all coefficients, so features on larger scales receive systematically smaller coefficients and are penalised unevenly.

@@ id=s3-logistic-regression | title=Logistic regression | kind=concept | topic=S3 · Logistic regression | key | tags=classification,exam,formula
**Logistic regression is a linear model for classification.** It transforms the output of ordinary linear regression using the logistic function — hence the name.

**Logistic (sigmoid) function:**

$$\sigma(z) = \dfrac{1}{1 + e^{-z}}$$

**Logistic regression:**

$$z = b + w_1x_1 + w_2x_2 + \dots \qquad \hat{y} = \dfrac{1}{1 + e^{-(b + w_1x_1 + w_2x_2 + \dots)}}$$

The function transforms real-valued input to an output **between 0 and 1**, interpreted as **the probability that the input belongs to the positive class**, given its features.

**If the output is greater than a threshold (usually 0.5), the object belongs to the positive class; otherwise the negative class.**

## Check yourself
1. What does the sigmoid output represent? :: The probability that the instance belongs to the positive class.
2. What is the usual decision threshold, and why might you change it? :: 0.5. You would move it for imbalanced data or asymmetric error costs — Session 3 lists threshold adjustment via AUC-ROC as an imbalance remedy.
3. Why is a "regression" method used for classification? :: It performs linear regression internally, then squashes the result through the sigmoid into a class probability.

@@ id=s3-logistic-training | title=Training logistic regression | kind=concept | topic=S3 · Logistic regression | key | tags=training,exam
Three facts, all examinable:

1. Cost function is **log loss**, also known as **cross-entropy loss**.
2. There is **no known closed-form equation** for the parameters that minimise it — so **gradient descent** (batch, stochastic or mini-batch) is used.
3. The cost function is **convex**, so gradient descent is **guaranteed to find the global minimum**.

The contrast with linear regression is the point: linear regression has *both* a closed form and gradient descent; logistic regression has **only** gradient descent, but keeps the convexity guarantee.

## Check yourself
1. Why can logistic regression not be trained with a normal equation? :: No closed-form solution exists for minimising log loss.
2. Does that mean the optimum might be missed? :: No — the log-loss cost is convex, so gradient descent still reaches the global minimum.

@@ id=s3-regression-metrics | title=Regression metrics: MSE, RMSE, MAE, MAPE | kind=cheatsheet | topic=S3 · Evaluation | key | tags=evaluation,exam,formula
With $e_i = y_i - \hat{y}_i$:

| Metric | Formula | Units | Character |
| --- | --- | --- | --- |
| **MSE** | $\frac{1}{N}\sum e_i^2$ | squared | punishes large errors hardest |
| **RMSE** | $\sqrt{\frac{1}{N}\sum e_i^2}$ | **same as $y$** | the readable version of MSE |
| **MAE** | $\frac{1}{N}\sum \|e_i\|$ | same as $y$ | robust to outliers |
| **MAPE** | $\frac{1}{N}\sum \left\|\frac{e_i}{y_i}\right\| \times 100\%$ | percent | scale-free; **breaks when $y_i = 0$** |

```python
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import numpy as np

mse  = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
mae  = mean_absolute_error(y_test, y_pred)
```

**Choosing:** RMSE when large errors matter disproportionately and you want readable units; MAE when outliers should not dominate; MAPE when relative error is what the domain cares about — but never with targets near zero.

## Check yourself
1. Why prefer RMSE over MSE when reporting? :: RMSE is in the same units as the target, so it is directly interpretable.
2. When does MAPE fail? :: When any true value is zero or near zero — the division explodes.
3. Which of MSE and MAE is more affected by a single large error? :: MSE, because errors are squared.

@@ id=s3-confusion-matrix | title=The confusion matrix | kind=concept | topic=S3 · Evaluation | key | tags=evaluation,exam,core | cards=card-016
Evaluation focuses on **predictive capability** rather than speed, scalability, etc.

| | **Predicted Yes** | **Predicted No** |
| --- | --- | --- |
| **Actual Yes** (positive) | TP | FN |
| **Actual No** (negative) | FP | TN |

| Cell | Meaning |
| --- | --- |
| **TP** true positives | positive points **correctly** labelled |
| **TN** true negatives | negative points **correctly** labelled |
| **FP** false positives | **negative** points incorrectly labelled positive |
| **FN** false negatives | **positive** points mislabelled as negative |

**Memory rule:** the second word is *what the classifier said*, the first word is *whether it was right*. A false positive is a point the classifier called positive, wrongly.

```python
from sklearn.metrics import confusion_matrix
confusion_matrix(y_test, y_pred)     # [[TN, FP], [FN, TP]] — note sklearn's order
```

**sklearn's layout is transposed relative to the slides**: row 0 is the negative class, and the matrix reads `[[TN, FP], [FN, TP]]`. Read the labels, never assume the corner.

## Check yourself
1. A spam filter marks a real email as spam. Which cell? :: False positive — predicted positive (spam), incorrectly.
2. A cancer screen misses a tumour. Which cell, and why is it the costly one here? :: False negative. The disease is present but undetected, so the patient goes untreated.
3. What order does sklearn's `confusion_matrix` use for a binary problem? :: `[[TN, FP], [FN, TP]]` — negative class first, unlike the lecture layout.

@@ id=s3-precision-recall-f | title=Precision, recall and F-measure | kind=cheatsheet | topic=S3 · Evaluation | key | tags=evaluation,exam,formula | cards=card-016
$$\text{Accuracy} = \dfrac{TP + TN}{TP + TN + FP + FN}$$

$$\text{Precision } (p) = \dfrac{TP}{TP + FP} \qquad \text{Recall } (r) = \dfrac{TP}{TP + FN}$$

$$F\text{-measure} = 2 \times \dfrac{p \times r}{p + r}$$

The slides' phrasing, which is the clearest way to keep them apart:

* **Precision is a measure of exactness** — what percentage of points labelled positive actually are.
* **Recall is a measure of completeness** — what percentage of positive points are labelled as such.

Also defined:

$$\text{tp rate} = \dfrac{TP}{P} \qquad \text{fp rate} = \dfrac{FP}{N}$$

**Denominator rule:** precision divides by *what you predicted positive*; recall divides by *what actually is positive*. Both have TP on top; only the denominator moves.

```python
from sklearn.metrics import precision_score, recall_score, f1_score, classification_report
print(classification_report(y_test, y_pred))    # all of them at once
```

## Check yourself
1. Give precision and recall in words. :: Precision is exactness — of everything called positive, how much really was. Recall is completeness — of everything actually positive, how much was found.
2. Which denominator does each use? :: Precision uses $TP + FP$ (all predicted positive); recall uses $TP + FN$ (all actually positive).
3. Why combine them into F-measure? :: Either alone is trivially gamed — predict everything positive for perfect recall, or predict one certain case for perfect precision. The harmonic mean forces both to be decent.

@@ id=s3-roc-auc | title=ROC curve and AUC | kind=concept | topic=S3 · Evaluation | key | tags=evaluation,exam
**ROC curves are two-dimensional graphs with tp rate on the Y axis and fp rate on the X axis.** The curve depicts relative trade-offs between benefits (true positives) and costs (false positives).

* A technique for **visualising, organising and selecting classifiers** based on their performance.
* **Especially useful for domains with skewed class distribution and unequal classification error costs.**
* **AUC** — the area under the ROC curve — reduces the curve to a **single scalar** representing expected performance.

Reading AUC: 1.0 is perfect, 0.5 is random guessing. Above all, AUC is **threshold-independent** — it summarises performance across every possible decision threshold, which is why it survives class imbalance where accuracy does not.

```python
from sklearn.metrics import roc_auc_score, roc_curve
y_proba = clf.predict_proba(X_test)[:, 1]    # probabilities, not labels
roc_auc_score(y_test, y_proba)
```

**Feed AUC probabilities, not predicted labels.** `predict_proba(...)[:, 1]` takes the positive class column. Passing hard labels collapses the curve to a single point and gives a meaningless number.

## Check yourself
1. What is on each axis of an ROC curve? :: True positive rate on Y, false positive rate on X.
2. What does AUC = 0.5 mean? :: Performance equivalent to random guessing.
3. Why does `roc_auc_score` need probabilities? :: The curve is traced by sweeping the decision threshold, which requires a continuous score rather than a final label.

@@ id=s3-accuracy-limitation | title=The limitation of accuracy, with numbers | kind=traps | topic=S3 · Evaluation | key | tags=evaluation,imbalance,exam | cards=card-016
The slides' worked example, worth memorising as a ready-made exam answer:

> Class 0: 9990 examples. Class 1: 10 examples.
> If the model predicts everything to be class 0, accuracy is $9990/10000 = 99.9\%$.
> **Accuracy is misleading because the model does not detect any class 1 example.**

> For imbalanced data, use **confusion matrix, precision, recall, or F-measure** to determine class-wise performance.

Four ways to deal with the imbalance itself:

1. **undersampling or oversampling** (e.g. SMOTE) to balance the data;
2. **altering the prediction threshold** by probability calibration, finding an optimal threshold using the AUC-ROC curve;
3. **cost-sensitive learning** — assign weights to classes so minority classes get larger weight;
4. **novelty/anomaly detection** framing.

## Check yourself
1. Reproduce the 99.9% example. :: With 9990 class-0 and 10 class-1 examples, always predicting class 0 gives 9990/10000 = 99.9% accuracy while detecting no positives at all.
2. Which metrics should replace accuracy there? :: Confusion matrix, precision, recall, F-measure — and AUC.
3. Name the four remedies for imbalance. :: Resampling (under/over, SMOTE), threshold adjustment via calibration and AUC-ROC, cost-sensitive learning with class weights, and anomaly-detection framing.

@@ id=s3-assessment-methods | title=Holdout, cross-validation, leave-one-out | kind=cheatsheet | topic=S3 · Assessment | key | tags=evaluation,exam,core
How to obtain a **reliable estimate** of performance. Performance depends on more than the algorithm: **class distribution, cost of misclassification, size of training and test sets.**

| Method | How | Note |
| --- | --- | --- |
| **Holdout** | reserve roughly **2/3 training, 1/3 testing** | ratio varies with data size and training time |
| **Random subsampling** | repeated holdout | averages away one unlucky split |
| **k-fold cross validation** | partition into **k disjoint equally-sized** subsets; train on k−1, test on the remaining one; repeat | **commonly k = 10** |
| **Leave-one-out** | k = N — only one point per fold | maximum data use, maximum cost |

```python
from sklearn.model_selection import cross_val_score, KFold, StratifiedKFold

scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
print(scores.mean(), scores.std())
```

**Report the standard deviation as well as the mean.** A mean of 0.85 ± 0.02 and 0.85 ± 0.15 are very different results, and the second is not trustworthy.

## Check yourself
1. What is the common value of k in k-fold cross validation? :: 10.
2. What is leave-one-out in terms of k? :: k = N, one data point per fold.
3. What is the usual holdout ratio? :: Roughly 2/3 training and 1/3 testing.

@@ id=s3-sampling-methods | title=Stratified sampling and bootstrap | kind=concept | topic=S3 · Assessment | key | tags=evaluation,exam
**Stratified sampling** — if the dataset $D$ is divided into mutually disjoint parts called **strata**, a stratified sample is generated by taking a simple random sample at each stratum. **This helps ensure a representative sample, especially when the data are skewed.**

**Bootstrap** — samples $D$ uniformly **with replacement**: each time a point is selected it is re-added, so it is equally likely to be selected again.

Both reappear later:

* stratified sampling → `stratify=y` in `train_test_split`, and `StratifiedKFold`;
* bootstrap → **bagging** in Session 5 is literally "bootstrap aggregating".

```python
from sklearn.model_selection import StratifiedKFold, RepeatedStratifiedKFold
cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=1)   # Lab 4's choice
```

## Check yourself
1. What does "with replacement" mean and which method uses it? :: A selected point is returned to the pool and can be picked again. The bootstrap uses it.
2. When is stratified sampling especially important? :: When the data are skewed — imbalanced classes — so that each split keeps a representative class mix.

@@ id=s3-trap-test-set-tuning | title=Trap: tuning against the test set | kind=traps | topic=S3 · Debugging | key | tags=leakage,evaluation,exam
The "unsatisfied" arrow in the pipeline diagram loops back to preprocessing and modelling — **not to the test set**.

```text
train set        → fit the model
validation set   → choose hyperparameters, decide when to stop
test set         → touched ONCE, at the very end
```

If you try twenty configurations and report the best test score, that number is an optimistic estimate — you have selected on the test set, so it is no longer unseen. This is why early stopping uses a **validation** set, and why `GridSearchCV` cross-validates **within the training data**.

## Check yourself
1. What are the three splits for and how often is each used? :: Train — fit parameters, used constantly. Validation — choose hyperparameters and stopping point, used repeatedly. Test — final estimate, used once.
2. You picked the best of twenty models by test score. What is wrong with reporting that score? :: It is optimistically biased; selecting on the test set makes it part of model selection, so it no longer estimates unseen performance.

@@ id=s3-trap-metric-choice | title=Trap: the default metric is rarely the right one | kind=traps | topic=S3 · Debugging | key | tags=evaluation,debugging,exam
| Situation | Do not use | Use |
| --- | --- | --- |
| Imbalanced classes | accuracy | precision/recall/F1, AUC, confusion matrix |
| False negatives are costly (disease screening) | accuracy or precision | **recall** |
| False positives are costly (spam filter) | accuracy or recall | **precision** |
| Regression with outliers | MSE/RMSE alone | MAE alongside |
| Regression, targets near zero | MAPE | RMSE or MAE |

`cross_val_score(..., scoring=...)` and `GridSearchCV(..., scoring=...)` both default to accuracy for classifiers. **On imbalanced data that means you are tuning for the wrong thing** — the search will happily select a model that ignores the minority class.

## Check yourself
1. Which metric matters most when missing a positive is dangerous? :: Recall — it measures how many of the true positives you actually caught.
2. What is the risk of leaving `scoring` at its default in a grid search on imbalanced data? :: You optimise accuracy, so the search favours models that predict the majority class and ignore the minority one.
