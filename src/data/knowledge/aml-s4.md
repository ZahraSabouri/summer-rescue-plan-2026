@@ id=s4-classification-def | title=Classification, defined | kind=concept | topic=S4 · Foundations | key | tags=classification,exam
> Given a collection of records (**training set**), each containing a set of attributes, one of which is the class — **find a model for the class attribute as a function of the values of other attributes.**
>
> **Goal: previously unseen records should be assigned a class as accurately as possible.**

A **test set** determines the accuracy of the model. The dataset is divided into training and test sets: training builds the model, test evaluates it.

Note what the definition emphasises: not fitting the training data, but assigning **previously unseen records** correctly. Generalisation is in the definition itself.

## Check yourself
1. What is the stated goal of classification? :: To assign previously unseen records to classes as accurately as possible.

@@ id=s4-knn-what | title=k-NN: what it is | kind=concept | topic=S4 · k-NN | key | tags=knn,exam
Four labels the slides attach to k-NN, all examinable:

* a type of **instance-based learning**, or **lazy learning**
* a **nonparametric** method
* usable for **both classification and regression**, though commonly classification
* **learning is very fast** — there is essentially no training; you just store the examples

**Training algorithm:** store the training data points. Set the value of $k$. That is all.

**Prediction algorithm** — to classify a new input vector $x$:

1. calculate the distance from $x$ to each data point in the training set;
2. find the $k$ training points nearest to $x$;
3. assign $x$ to the **most frequently occurring class** among them.

"Lazy" is precise: the work is deferred from training time to query time.

## Check yourself
1. Why is k-NN called lazy learning? :: It does no work at training time beyond storing the data; all computation happens when a query arrives.
2. Give the three prediction steps. :: Compute distances to all training points, take the k nearest, assign the majority class among them.

@@ id=s4-knn-pros-cons | title=k-NN: advantages and disadvantages | kind=cheatsheet | topic=S4 · k-NN | key | tags=knn,exam
| Advantages | Disadvantages |
| --- | --- |
| Training is very fast (no training required) | **Slow at query time** |
| Can learn complex target functions | **Sensitive to noise and irrelevant attributes** |
| Simple and intuitive, easy to program | must pass through all data for each classification — **prohibitive for large datasets** |
| Accuracy can be very good; can outperform more complex models | |

The trade-off is unusual and worth stating plainly in an answer: k-NN moves *all* the cost from training to prediction. Every other method in this module does the opposite.

## Check yourself
1. Why is k-NN a poor choice for a large dataset in production? :: Each prediction requires computing distances to every stored training point, so query time grows with the dataset.
2. Why do irrelevant attributes hurt k-NN particularly? :: They contribute to the distance calculation, so noise dimensions push genuinely similar points apart.

@@ id=s4-knn-issues | title=k-NN: distance, choosing k, and scaling | kind=concept | topic=S4 · k-NN | key | tags=knn,exam,scaling
**Distance measure.** Most common is **Euclidean distance**:

$$d(x_i, x_j) = \left(\sum_{l=1}^{n} |x_{i,l} - x_{j,l}|^2\right)^{1/2}$$

**Choosing k** — the single most important line in this note:

> **Increasing $k$ reduces variance, increases bias.**

Small $k$ (say 1) gives a jagged boundary that follows every point, including noise — low bias, high variance. Large $k$ smooths the boundary — high bias, low variance. The slides show $k = 1$ versus $k = 15$ side by side.

**Feature scaling is needed if features are not commensurate.** A feature measured in thousands dominates the distance and the others become irrelevant. This is the clearest case of why Session 2's scaling matters.

## Check yourself
1. What happens to bias and variance as k increases? :: Variance decreases, bias increases.
2. Why must features be scaled for k-NN? :: The distance is a sum over features, so a feature with a large numeric range dominates and effectively erases the others.
3. What is the default k in sklearn's `KNeighborsClassifier`? :: 5.

@@ id=s4-svm-linear | title=SVM as a linear classifier | kind=concept | topic=S4 · SVM | key | tags=svm,exam,formula
**Linear classifiers for binary classes.** The classifier is:

$$f(x) = \text{sign}(\mathbf{w}^T\mathbf{x} + b)$$

The slides' worked example, worth being able to reproduce:

$$f(x) = 1.5x_1 - x_2 - 0.1, \qquad \mathbf{w} = (1.5, -1),\ b = -0.1$$

* For the point $(-0.8, 1)$: $\text{sign}(1.5 \times (-0.8) - 1 - 0.1) = \text{sign}(-2.3) = -1$
* For the point $(0.1, -2)$: $\text{sign}(1.5 \times 0.1 - (-2) - 0.1) = \text{sign}(2.05) = +1$

**Note the class labels are $+1$ and $-1$, not 1 and 0.** The slides flag this explicitly — the maths of the margin depends on it, since $y_i(\mathbf{w}^T\mathbf{x}_i + b) \geq 1$ only works as a single condition with symmetric labels.

## Check yourself
1. Classify the point $(2, 0)$ under $f(x) = 1.5x_1 - x_2 - 0.1$. :: $1.5 \times 2 - 0 - 0.1 = 2.9$, so sign is $+1$ — the positive class.
2. What class labels does the SVM formulation use, and why does it matter? :: $+1$ and $-1$. The symmetric labels let the margin constraint be written as a single inequality $y_i(\mathbf{w}^T\mathbf{x}_i + b) \geq 1$.

@@ id=s4-svm-margin | title=Margin and support vectors | kind=concept | topic=S4 · SVM | key | tags=svm,exam,core
The two classes can be separated by **many different lines**. Which one is best?

* The points **nearest to the separation line** (plane in 3-D, hyperplane in higher dimensions) define the **margin** — the gap between classes.
* **Those points are called support vectors.**
* **Support vector machine aims to maximise the margin.**

With the scale constraint $\min_i |\mathbf{w}^T\mathbf{x}_i + b| = 1$, the margin width works out to

$$\rho = \dfrac{2}{\|\mathbf{w}\|}$$

so **maximising the margin is minimising $\|\mathbf{w}\|$**. The optimisation is usually written:

> Find $\mathbf{w}$ and $b$ such that $L(\mathbf{w}) = \frac{1}{2}\mathbf{w}^T\mathbf{w}$ is minimised, and for all $(x_i, y_i)$: $y_i(\mathbf{w}^T\mathbf{x}_i + b) \geq 1$

The solution has the form $\mathbf{w} = \sum \alpha_i y_i \mathbf{x}_i$, and **each non-zero $\alpha_i$ indicates that the corresponding $x_i$ is a support vector.** Everything else could be deleted without changing the model — that is the defining property.

## Check yourself
1. What are support vectors? :: The training points nearest the decision boundary; they define the margin and are the only points with non-zero $\alpha_i$.
2. Why does maximising the margin become minimising $\|\mathbf{w}\|$? :: The margin width is $2/\|\mathbf{w}\|$, so it grows as the norm shrinks.
3. What would happen to the model if you deleted a non-support-vector training point? :: Nothing. Only support vectors contribute to $\mathbf{w}$.

@@ id=s4-svm-soft-margin | title=Soft margin and the C parameter | kind=concept | topic=S4 · SVM | key | tags=svm,exam,regularisation
If the training data is **not linearly separable**, **slack variables** $\xi_i$ are added to allow misclassification of difficult or noisy examples. "Let some points be moved to where they belong, at a cost."

The formulation gains a penalty term:

> Find $\mathbf{w}$, $b$ minimising $L(\mathbf{w}) = \frac{1}{2}\mathbf{w}^T\mathbf{w} + C\sum_i \xi_i$, subject to $y_i(\mathbf{w}^T\mathbf{x}_i + b) \geq 1 - \xi_i$ and $\xi_i \geq 0$

**Training SVM involves regularisation by default**, and its strength is controlled by $C > 0$:

| C | Regularisation | Behaviour |
| --- | --- | --- |
| **Larger C** | **less** regularisation | fit the training data as accurately as possible; each individual point matters |
| **Smaller C** | **more** regularisation | more tolerant of errors on individual points |

**The direction is the trap.** Larger $C$ = *less* regularisation = more overfitting risk. This is the opposite of $\alpha$ in Ridge/LASSO, where larger means more regularisation. Learn them as a pair so you do not blend them.

## Check yourself
1. Does larger C mean more or less regularisation? :: Less. Large C penalises slack heavily, forcing a tight fit to the training data.
2. How does that compare with $\alpha$ in Ridge regression? :: Opposite. Larger $\alpha$ means more regularisation; larger $C$ means less.
3. What are slack variables for? :: To allow some points to violate the margin at a cost, so a usable boundary exists even when the data is not linearly separable.

@@ id=s4-svm-kernels | title=Kernels and the kernel trick | kind=concept | topic=S4 · SVM | key | tags=svm,exam
Some datasets are simply not separable in their original space. **Map the data to a higher-dimensional space where it is:**

> The original feature space can always be mapped to some higher-dimensional feature space where the training set is separable.

**SVM uses a kernel function — which is a similarity measure between data points — to map data from input space to a higher-dimensional feature space.**

Why kernels: **make a non-separable problem separable**, and **map data into a better representational space**.

| Kernel | Form |
| --- | --- |
| **Linear** | $K(x, x') = x^T x'$ |
| **Polynomial** | $K(x, x') = (1 + x^Tx')^d$ |
| **Radial basis function (RBF)** | $K(x, x') = \exp\left(-\dfrac{\|x - x'\|^2}{2\sigma^2}\right) = \exp(-\gamma\|x-x'\|^2)$ |

The reason this is cheap: the classifying function $f(x) = \sum \alpha_i y_i x_i^T x + b$ **relies only on inner products** between the test point and the support vectors. Replace the inner product with $K$ and you get the higher-dimensional behaviour without ever computing the mapping — the *kernel trick*.

## Check yourself
1. What is a kernel, in one phrase? :: A similarity measure between data points that stands in for an inner product in a higher-dimensional space.
2. Why is the kernel trick efficient? :: The SVM solution depends on the data only through inner products, so substituting a kernel gives high-dimensional separation without computing the mapping.
3. Name the three kernels in the module. :: Linear, polynomial, RBF.

@@ id=s4-svm-gamma-c | title=Reading gamma and C on RBF SVM | kind=cheatsheet | topic=S4 · SVM | key | tags=svm,exam,hyperparameters | cards=card-020
Lab 4 plots the four corners of $(\gamma, C)$ — $\gamma \in \{0.1, 5\}$ and $C \in \{0.001, 1000\}$. Learn what each corner looks like.

| Parameter | Small | Large |
| --- | --- | --- |
| **$\gamma$** | wide influence per point → **smooth, simple** boundary | narrow influence → **wiggly** boundary hugging individual points |
| **$C$** | tolerant of errors → **smooth**, more regularised | intolerant → **tight**, fits every point |

$\gamma$ appears in $\exp(-\gamma\|x-x'\|^2)$: large $\gamma$ makes the exponential decay fast, so each support vector only influences its immediate neighbourhood.

**Both large = maximum overfitting. Both small = maximum underfitting.** Diagnostically: a boundary made of little islands around individual points means $\gamma$ is too high.

sklearn's default is `gamma='scale'`, i.e. $1/(n\_features \times X.var())$, and `C=1`.

## Check yourself
1. Your RBF SVM boundary is a set of tiny islands around individual training points. Which hyperparameter, which direction? :: $\gamma$ is too large — reduce it so each point's influence spreads further.
2. What is sklearn's default gamma? :: `'scale'`, equal to $1/(n\_features \times X.var())$.

@@ id=s4-svm-code | title=SVM code recipes | kind=cheatsheet | topic=S4 · Code recipes | key | tags=code,sklearn,svm,exam
**Polynomial features + linear SVM** — expand the features, then separate linearly:

```python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.svm import LinearSVC

polynomial_svm_clf = Pipeline([
    ("poly_features", PolynomialFeatures(degree=3)),
    ("scaler", StandardScaler()),
    ("svm_clf", LinearSVC(C=10, loss="hinge", random_state=42)),
])
polynomial_svm_clf.fit(X, y)
```

**Kernel SVM** — same effect, without materialising the expanded features:

```python
from sklearn.pipeline import make_pipeline
from sklearn.svm import SVC

poly_kernel_svm_clf = make_pipeline(
    StandardScaler(),
    SVC(kernel="poly", degree=3, coef0=1, C=5))

rbf_kernel_svm_clf = Pipeline([
    ("scaler", StandardScaler()),
    ("svm_clf", SVC(kernel="rbf", gamma=0.1, C=1000)),
])
```

**SVM for regression** — `SVR`, with an $\epsilon$-insensitive tube:

```python
from sklearn.svm import SVR
svm_poly_reg = SVR(kernel="poly", degree=2, C=100, epsilon=0.1, gamma="scale")
```

**Always scale before an SVM** — every one of these pipelines does. `make_pipeline` is the terse form of `Pipeline`; it names the steps for you.

## Check yourself
1. Why does every SVM example sit inside a pipeline with a scaler? :: SVMs are distance/inner-product based, so unscaled features distort the margin.
2. What does `epsilon` do in `SVR`? :: It sets the width of the tube within which errors are not penalised at all.
3. What is the difference between `Pipeline` and `make_pipeline`? :: `make_pipeline` auto-names the steps from the class names; `Pipeline` takes explicit `(name, estimator)` tuples.

@@ id=s4-dt-anatomy | title=Decision tree anatomy | kind=concept | topic=S4 · Decision trees | key | tags=trees,exam
| Part | Definition |
| --- | --- |
| **Root node** | no incoming edges, zero or more outgoing edges |
| **Internal node** | a **test on an attribute** |
| **Branch** | an **outcome** of the test |
| **Leaf / terminal node** | a **class label** |

At each node, **one attribute is chosen to split the training examples into distinct classes as much as possible**. A new case is classified by **following a matching path to a leaf node**.

The slides make one more point by showing two different trees over the same Refund/MarSt/TaxInc data:

> **There could be more than one tree that fits the same data.**

That non-uniqueness is exactly the instability that Random Forests exist to tame.

## Check yourself
1. What does an internal node represent, and a leaf? :: An internal node is a test on an attribute; a leaf is a class label.
2. Can two different trees fit the same training data? :: Yes — the slides show two. Which one you get depends on the split choices, which is why trees are unstable.

@@ id=s4-dt-splitting | title=Choosing the splitting attribute | kind=concept | topic=S4 · Decision trees | key | tags=trees,exam
At each node, available attributes are evaluated on their ability to **separate the classes**. A **goodness function** does the scoring. Two typical ones:

* **information gain (entropy)** — used in ID3 / C4.5
* **GINI index** — used in IBM Intelligent Miner

**Greedy approach: nodes with homogeneous class distribution are preferred.** So you need a measure of **node impurity**:

```text
C0: 5      C0: 9
C1: 5      C1: 1
non-homogeneous,   homogeneous,
high impurity      low impurity
```

The criterion for the best attribute: **the one which will result in the smallest tree**. The heuristic: **choose the attribute that produces the "purest" nodes.**

**Algorithms named:** Hunt's (one of the earliest), CART (Classification And Regression Tree), ID3 (Iterative Dichotomiser 3), C4.5 (successor of ID3), SLIQ, SPRINT.

## Check yourself
1. What is the heuristic for choosing a splitting attribute? :: Choose the one producing the purest child nodes — the greatest reduction in impurity.
2. Which impurity measure does ID3/C4.5 use? :: Information gain, based on entropy.

@@ id=s4-entropy | title=Entropy and information gain, with worked numbers | kind=cheatsheet | topic=S4 · Decision trees | key | tags=trees,exam,formula
**Entropy at node $t$:**

$$Entropy(t) = -\sum_j p(j|t)\log_2 p(j|t)$$

where $p(j|t)$ is the relative frequency of class $j$ at node $t$. It **measures homogeneity**:

* **Maximum** entropy when records are **equally distributed** among all classes — least information.
* **Minimum** entropy (**0.0**) when all records belong to **one class** — most information.

The slides' three worked examples, worth being able to redo:

| Counts | Probabilities | Entropy |
| --- | --- | --- |
| C1 = 0, C2 = 6 | 0, 1 | $-0 - 1\log_2 1 = 0$ |
| C1 = 1, C2 = 5 | 1/6, 5/6 | $-\frac{1}{6}\log_2\frac{1}{6} - \frac{5}{6}\log_2\frac{5}{6} = 0.65$ |
| C1 = 2, C2 = 4 | 2/6, 4/6 | $-\frac{2}{6}\log_2\frac{2}{6} - \frac{4}{6}\log_2\frac{4}{6} = 0.92$ |

**Information gain:**

$$GAIN_{split} = Entropy(p) - \sum_{i=1}^{k}\dfrac{n_i}{n}Entropy(i)$$

where the parent node $p$ is split into $k$ partitions and $n_i$ is the number of records in partition $i$. It **measures the reduction in entropy achieved by the split — choose the split that maximises GAIN.**

## Check yourself
1. What is the entropy of a node whose records are all one class? :: 0 — perfectly pure, maximum information.
2. When is entropy maximal? :: When records are equally distributed across all classes.
3. In words, what does information gain measure? :: The reduction in entropy from parent to the weighted average of the children — how much purer the split made things.

@@ id=s4-gini | title=Gini index | kind=cheatsheet | topic=S4 · Decision trees | key | tags=trees,exam,formula
For a dataset $t$ containing examples from $c$ classes:

$$gini(t) = 1 - \sum_{j=1}^{c} p_j^2$$

where $p_j$ is the relative frequency of class $j$ in $t$.

The slides' worked example — a node with 3 classes holding [0, 49, 5] samples:

$$gini(T) = 1 - (0/54)^2 - (49/54)^2 - (5/54)^2 \approx 0.168$$

When $t$ of $n$ points splits into $t_1, t_2$ of sizes $n_1, n_2$:

$$gini_{split}(t) = \dfrac{n_1}{n}gini(t_1) + \dfrac{n_2}{n}gini(t_2)$$

**The attribute providing the smallest $gini_{split}(t)$ is chosen** — you need to enumerate all possible splitting points for each attribute.

**Direction trap:** you **maximise** information gain but **minimise** Gini. Both mean "purest children"; the sign convention differs. Gini is sklearn's default `criterion` for `DecisionTreeClassifier`.

## Check yourself
1. Do you maximise or minimise Gini when choosing a split? :: Minimise — lower Gini means purer nodes.
2. What is the Gini of a perfectly pure node? :: 0.
3. Which criterion is sklearn's default? :: Gini.

@@ id=s4-dt-test-conditions | title=Split types by attribute type | kind=cheatsheet | topic=S4 · Decision trees | tags=trees,exam
How to specify a test condition depends on the attribute type and the number of ways to split.

| Attribute type | Split options |
| --- | --- |
| **Nominal** (unordered — marital status, gender, colour) | **multi-way**: one partition per distinct value; or **binary**: divide values into two subsets, needing an optimal partitioning |
| **Continuous** (ordered — age, salary) | **binary**: `Taxable Income > 80K?`; or **multi-way**: ranges like [10K,25K), [25K,50K), [50K,80K] |

Binary splits on nominal attributes are the expensive case: with $v$ values there are $2^{v-1}-1$ possible two-subset partitions to consider.

@@ id=s4-regression-trees | title=Regression trees | kind=concept | topic=S4 · Decision trees | tags=trees,exam,formula
**Training a regression tree is the same as a classification tree, except the split minimises the MSE.**

If node $t_k$ of $n$ points splits into $t_1, t_2$ of sizes $n_1, n_2$, the cost function is:

$$J = \dfrac{n_1}{n}MSE_1 + \dfrac{n_2}{n}MSE_2$$

where for each node

$$MSE_{node} = \sum_{i \in node}(\hat{y}_{node} - y_i)^2, \qquad \hat{y}_{node} = \dfrac{1}{n_{node}}\sum_{i \in node} y_i$$

So a leaf predicts **the mean of the training targets that land in it**, and the split is chosen to make those means fit best. Same tree-growing machinery, different impurity measure — impurity for regression *is* squared error.

## Check yourself
1. What does a regression tree leaf predict? :: The mean of the training target values falling in that leaf.
2. What replaces entropy/Gini as the split criterion? :: Mean squared error, weighted by node size.

@@ id=s4-dt-pros-cons | title=Decision trees: pros and cons | kind=cheatsheet | topic=S4 · Decision trees | key | tags=trees,exam
| Pros | Cons |
| --- | --- |
| **Interpretable decision process: white box model** | **Splits are perpendicular to an axis**, so sensitive to rotation of the training set → *solution: use PCA to get a better orientation* |
| **Requires little data preparation: no need of feature scaling or centering at all** | **Very sensitive to small variations in the training data**, leading to different trees → *solution: use Random Forest to limit instability* |

Both cons come with the module's own named remedies, which makes this a very likely exam question. Note that the second con is the entire motivation for Session 5.

Trees also convert cleanly to rules — one rule per root-to-leaf path:

```text
R1: If (Outlook=Sunny) ∧ (Humidity=High)   Then PlayTennis=No
R2: If (Outlook=Sunny) ∧ (Humidity=Normal) Then PlayTennis=Yes
R3: If (Outlook=Overcast)                  Then PlayTennis=Yes
R4: If (Outlook=Rain)   ∧ (Wind=Strong)    Then PlayTennis=No
R5: If (Outlook=Rain)   ∧ (Wind=Weak)      Then PlayTennis=Yes
```

## Check yourself
1. Why do decision trees need no feature scaling? :: Each split compares values within a single feature, so features are never combined and their relative scales never interact.
2. Name the two cons and the module's remedy for each. :: Axis-perpendicular splits, sensitive to rotation — use PCA to reorient. Instability under small data changes — use Random Forest.
3. What does "white box" mean here? :: The decision process is fully inspectable and can be read as a set of if-then rules.

@@ id=s4-dt-code | title=Decision tree code | kind=cheatsheet | topic=S4 · Code recipes | key | tags=code,sklearn,trees
```python
from sklearn.datasets import load_iris
from sklearn.tree import DecisionTreeClassifier, plot_tree

iris = load_iris()
X = iris.data[:, 2:]        # petal length and width only
y = iris.target

tree_clf = DecisionTreeClassifier(max_depth=2, random_state=42)
tree_clf.fit(X, y)

plot_tree(tree_clf, filled=True)     # visualise the actual splits
```

Hyperparameters that control overfitting, all forms of pre-pruning:

| Parameter | Effect |
| --- | --- |
| `max_depth` | hard cap on tree depth — the blunt, effective control |
| `max_leaf_nodes` | cap on the number of leaves |
| `min_samples_split` | do not split a node with fewer than this many samples |
| `min_samples_leaf` | every leaf must keep at least this many samples |
| `criterion` | `'gini'` (default) or `'entropy'` |

**An unconstrained decision tree will overfit almost any dataset** — it can keep splitting until every leaf is pure. `max_depth` is the first thing to set, and the first thing to check when a tree scores 1.00 on training data.

## Check yourself
1. What does an unconstrained decision tree do to training data, and what score results? :: It splits until leaves are pure, typically reaching 100% training accuracy — pure overfitting.
2. Name three hyperparameters that limit tree growth. :: `max_depth`, `max_leaf_nodes`, `min_samples_split`/`min_samples_leaf`.

@@ id=s4-hyperparameters-def | title=Parameters vs hyperparameters | kind=concept | topic=S4 · Hyperparameters | key | tags=exam,core | cards=card-020
**Machine learning models have hyperparameters that you must set in order to customise the model to a given dataset.** They are set *before* training; parameters are learned *during* training.

Hyperparameters may be integer-valued, real-valued, or categorical:

| Example | Type |
| --- | --- |
| $k$ of k-NN | integer |
| $C$ and $\gamma$ of SVM with RBF kernel | real |
| kernel of SVM | categorical — `{'linear', 'poly', 'rbf', ...}` |

Defaults exist but are rarely optimal: **`k=5` in `KNeighborsClassifier`, `C=1` and `gamma = 1/(n_features * X.var())` in `SVC`**.

> **Hyperparameter optimisation** (aka tuning / search) searches for a set of hyperparameter values that results in a model achieving the best performance on a given dataset.

**In sklearn the rule is visible in the code:** anything you pass to the constructor is a hyperparameter; anything ending in an underscore after `fit` (`coef_`, `support_`, `feature_importances_`) is a learned parameter.

## Check yourself
1. Distinguish parameter from hyperparameter. :: Parameters are learned from data during training; hyperparameters are set by the user beforehand to configure the model.
2. Give an example of each of the three hyperparameter types. :: Integer — k in k-NN. Real — C or gamma in SVM. Categorical — the SVM kernel choice.
3. How do you spot a learned parameter in sklearn? :: It carries a trailing underscore and only exists after `fit`.

@@ id=s4-grid-vs-random | title=Grid search vs random search | kind=cheatsheet | topic=S4 · Hyperparameters | key | tags=exam,tuning
| | **Grid search** | **Random search** |
| --- | --- | --- |
| Method | define a grid of values, **evaluate every position** | define a bounded domain, **randomly sample** points |
| Weakness | **suffers from the curse of dimensionality** — evaluations grow exponentially with the number of hyperparameters; increasing resolution multiplies cost | no guarantee of hitting the grid optimum |
| Strength | exhaustive within the grid | **works better when some hyperparameters are much more important than others** |
| Coverage of B evaluations | only $B^{1/N}$ distinct values per hyperparameter | **B distinct values per hyperparameter** |
| Parallelism | fine | **easier** — workers need not communicate, and failing workers do not leave holes in the design |

That coverage row is the real argument. With 3 hyperparameters and 64 evaluations, grid search tries only 4 values of each; random search tries 64 values of each. If only one hyperparameter actually matters, random search has explored it 16× more thoroughly.

Beyond both: **Bayesian optimisation** — Optuna, Hyperopt, Scikit-Optimize.

## Check yourself
1. Why does random search outperform grid search when only some hyperparameters matter? :: For the same budget it samples far more distinct values of each hyperparameter, so it explores the important dimension more finely.
2. What is grid search's core weakness? :: The curse of dimensionality — cost grows exponentially with the number of hyperparameters.
3. Name a Bayesian optimisation library. :: Optuna, Hyperopt, or Scikit-Optimize.

@@ id=s4-gridsearch-code | title=GridSearchCV, the exam-ready form | kind=cheatsheet | topic=S4 · Code recipes | key | tags=code,sklearn,tuning,exam | cards=card-020
Lab 4's grid search, which is the shape to reproduce:

```python
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold
from sklearn.svm import SVC

# 1. define the search space — lists of values per hyperparameter
parameters = {'kernel': ('linear', 'rbf'),
              'gamma': [0.1, 5],
              'C': [0.001, 1, 10, 1000]}

# 2. define the model
model = SVC(kernel="rbf")

# 3. define the evaluation scheme
cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=1)

# 4. define and run the search
search = GridSearchCV(model, parameters, scoring='accuracy', n_jobs=-1, cv=cv)
result = search.fit(X, y)

print('Best Score: %s' % result.best_score_)
print('Best Hyperparameters: %s' % result.best_params_)
```

`n_jobs=-1` uses all cores. `result.best_estimator_` is the refitted best model, ready to predict.

**Tuning a pipeline** uses `step__param` double-underscore naming:

```python
pipe = Pipeline([('scaler', StandardScaler()), ('svm', SVC())])
params = {'svm__C': [0.1, 1, 10], 'svm__gamma': [0.01, 0.1, 1]}
GridSearchCV(pipe, params, cv=5)
```

**Search the pipeline, not the bare model** — that way the scaler is refitted inside each CV fold and the search itself does not leak.

## Check yourself
1. What is the naming convention for tuning a parameter inside a pipeline step? :: `stepname__paramname` with a double underscore.
2. Why pass the whole pipeline to `GridSearchCV` rather than just the model? :: So every preprocessing step is refitted within each cross-validation fold, keeping the validation folds unseen.
3. What does this grid cost in fits? :: 2 kernels × 2 gammas × 4 C values = 16 combinations, × 5 splits × 3 repeats = 240 fits.

@@ id=s4-classifier-picker | title=Which classifier? Session 4's three, compared | kind=cheatsheet | topic=S4 · Foundations | key | tags=recall,exam | cards=card-017
| | k-NN | SVM | Decision tree |
| --- | --- | --- | --- |
| Training cost | none | high | moderate |
| Prediction cost | **high** | low | very low |
| Needs scaling | **yes** | **yes** | **no** |
| Handles categoricals directly | no | no | **yes** |
| Interpretable | somewhat | no (black box) | **yes (white box)** |
| Key hyperparameter | $k$ | $C$, $\gamma$, kernel | `max_depth` |
| Main weakness | slow queries, noise-sensitive | opaque, needs tuning | unstable |

The summary slide's own verdict:

* k-NN is simple but can produce good results for many complex problems.
* SVM is an important and popular method with many successful applications.
* DT is a white box method with good interpretability.
* **All three can be used for both classification and regression.**

## Check yourself
1. Which of the three needs no feature scaling? :: The decision tree.
2. Which can be used for regression as well as classification? :: All three — `KNeighborsRegressor`, `SVR`, `DecisionTreeRegressor`.

@@ id=s4-trap-scale-knn-svm | title=Trap: forgetting to scale for k-NN or SVM | kind=traps | topic=S4 · Debugging | key | tags=debugging,scaling,exam
Both are distance/inner-product based, so an unscaled feature with a large range silently dominates.

```python
# ✗ salary in tens of thousands drowns out age
KNeighborsClassifier().fit(X_train, y_train)

# ✓
make_pipeline(StandardScaler(), KNeighborsClassifier()).fit(X_train, y_train)
```

**Symptom:** mediocre accuracy with no error, and predictions that appear to ignore most features. Diagnose by comparing `X_train.std(axis=0)` across columns — if the orders of magnitude differ, you have found it.

Decision trees are the exception; adding a scaler there is harmless but pointless.

## Check yourself
1. What does the failure look like? :: No error, just poor accuracy, with the model effectively driven by whichever feature has the largest numeric range.
2. What is the quickest diagnostic? :: Compare per-column standard deviations of the training features; wildly different magnitudes mean scaling is missing.

@@ id=s4-trap-c-direction | title=Trap: getting the C direction backwards | kind=traps | topic=S4 · Debugging | key | tags=svm,debugging,exam
Two regularisation strengths that move in **opposite directions**:

| Parameter | Where | Larger means |
| --- | --- | --- |
| $\alpha$ | Ridge, LASSO, elastic net | **more** regularisation |
| $C$ | SVM, logistic regression | **less** regularisation |

Mnemonic: **C is for Cost of errors.** A high cost of error forces the model to fit every point, which is *less* regularisation. $\alpha$ is the penalty on the weights, so more penalty is more regularisation.

If your SVM is overfitting, **decrease** C. If a Ridge model is overfitting, **increase** alpha.

## Check yourself
1. Your SVM overfits. Which way do you move C? :: Down.
2. Your Ridge regression overfits. Which way do you move alpha? :: Up.

@@ id=s4-trap-grid-cost | title=Trap: a grid search that never finishes | kind=traps | topic=S4 · Debugging | tags=tuning,debugging,exam
Total fits = (product of all value-list lengths) × n_splits × n_repeats.

```python
parameters = {'kernel': ('linear', 'rbf'),   # 2
              'gamma': [0.1, 5],             # 2
              'C': [0.001, 1, 10, 1000]}     # 4
cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3)
# 2 × 2 × 4 = 16 combinations × 15 folds = 240 model fits
```

In a 1.5-hour timed test, **do the multiplication before you press run**. Ways to cut it: fewer values, `n_repeats=1`, plain `cv=5`, `n_jobs=-1`, or switch to `RandomizedSearchCV` with a fixed `n_iter`.

Also note `gamma` is ignored when `kernel='linear'`, so several of those 16 combinations are duplicates — a real inefficiency in the lab's own grid.

## Check yourself
1. How many fits does a 3×4 grid with 10-fold CV require? :: 12 combinations × 10 folds = 120 fits.
2. What is one redundancy in the lab's grid? :: `gamma` has no effect on a linear kernel, so the two linear/gamma combinations are duplicates.
