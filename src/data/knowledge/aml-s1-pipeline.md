@@ id=s1-skeleton | title=The whole pipeline in 20 lines | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,exam,pipeline | cards=card-001
The single most valuable thing to hold in memory. Every exam task is a mutation of this.

```python
from sklearn import datasets, svm
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import accuracy_score

# 1. get data
iris = datasets.load_iris()
X, y = iris.data, iris.target

# 2. split BEFORE anything else touches the data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42)

# 3. preprocess — fit on train only
scaler = MinMaxScaler()
scaler.fit(X_train)
X_train_scaled = scaler.transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# 4. model
clf = svm.SVC()
clf.fit(X_train_scaled, y_train)

# 5. evaluate
y_pred = clf.predict(X_test_scaled)
accuracy_score(y_test, y_pred)
```

Three invariants worth burning in:
* **split first**, before scaling or imputing;
* **`fit` on train, `transform` on both**;
* **`fit` takes `(X, y)`, `predict` takes `(X)` only.**

## Check yourself
1. Why is `scaler.fit()` called on `X_train` and not on all of `X`? :: Fitting on all the data lets the test set's min and max influence the transform. That is data leakage and it inflates your score.
2. What does `predict` take as arguments? :: Features only. Passing `y` to `predict` is a common slip.

@@ id=s1-load-builtin | title=Loading sklearn's built-in datasets | kind=cheatsheet | topic=S1 · Code recipes | tags=code,sklearn
```python
from sklearn import datasets

iris = datasets.load_iris()

X = iris.data       # features, a numpy array
y = iris.target     # labels
print(iris.DESCR)   # full text description — the fastest EDA there is
n = X.shape[0]      # number of data points
```

A loaded bunch has `.data`, `.target`, `.DESCR`, `.feature_names`, `.target_names`. `DESCR` is free EDA: it tells you feature meanings, units and class balance without a single plot.

Other loaders: `load_digits()`, `load_wine()`, `load_breast_cancer()`, `load_diabetes()` (regression).

@@ id=s1-load-csv | title=Loading a CSV and first look | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,pandas,lab
```python
import pandas as pd
import numpy as np

df = pd.read_csv('online_shoppers_intention.csv')
print('The shape of the dataset is', df.shape)

# stop pandas truncating wide output
pd.set_option('display.max_columns', None, 'display.expand_frame_repr', False)

print(df.head(5))
df.info()
```

`display.expand_frame_repr = False` stops wide frames wrapping onto multiple lines; `max_columns = None` stops the `...` in the middle. Both matter when you are reading output under time pressure.

@@ id=s1-train-test-split | title=train_test_split, argument by argument | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,sklearn,exam
```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.3,        # 30% held out
    random_state=42,      # reproducible split
    stratify=y,           # keep class proportions — use on imbalanced data
)
```

| Argument | Effect | When it bites |
| --- | --- | --- |
| `test_size` | fraction (or count) held out | 0.2–0.3 typical |
| `random_state` | fixes the shuffle | omit it and your score changes every run, making debugging impossible |
| `stratify=y` | preserves class proportions in both halves | omit on imbalanced data and a rare class can land entirely in one side |
| `shuffle` | defaults `True` | must be `False` for time series, or you train on the future |

**Return order is the trap:** `X_train, X_test, y_train, y_test` — all the X's before all the y's. Writing `X_train, y_train, X_test, y_test` silently gives you labels where features should be.

## Check yourself
1. What is the return order of `train_test_split`? :: `X_train, X_test, y_train, y_test`.
2. When must `shuffle=False`? :: Time-series data, where shuffling would let the model train on future observations and predict the past.
3. What does `stratify=y` do and when do you need it? :: Preserves the class proportions of `y` in both splits. Needed when classes are imbalanced.

@@ id=s1-scaling-recipe | title=Scaling without leaking | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,preprocessing,leakage,exam | cards=card-001
```python
from sklearn.preprocessing import MinMaxScaler

scaler = MinMaxScaler()
scaler.fit(X_train)                          # learn min/max from TRAIN only
X_train_scaled = scaler.transform(X_train)
X_test_scaled  = scaler.transform(X_test)    # apply the SAME transform
```

Equivalent shorthand for the train half:

```python
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)     # NEVER fit_transform here
```

| Scaler | Maps to | Use when |
| --- | --- | --- |
| `MinMaxScaler` | [0, 1] | bounded features, no severe outliers |
| `StandardScaler` | mean 0, sd 1 | roughly normal features; the usual default |

**`fit_transform` on the test set is the single most common leakage bug in this module.** If you see it in exam code, that is almost certainly the planted fault.

## Check yourself
1. What exactly does `fit` learn for a MinMaxScaler? :: The minimum and maximum of each feature, which define the mapping to [0, 1].
2. Why is `scaler.fit_transform(X_test)` wrong? :: It recomputes min/max from the test set, so test data influences its own transformation and the two halves are scaled inconsistently.

@@ id=s1-fit-predict-api | title=The sklearn estimator API | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,sklearn,exam
Every sklearn object follows the same three-verb contract. Learn the contract and you can use a model you have never seen.

| Verb | Who has it | Signature | Returns |
| --- | --- | --- | --- |
| `fit` | everything | `fit(X, y)` for models, `fit(X)` for transformers/clusterers | the fitted object |
| `predict` | models | `predict(X)` | predictions |
| `transform` | transformers | `transform(X)` | transformed X |
| `fit_transform` | transformers | `fit_transform(X)` | fit then transform in one call |

```python
clf = svm.SVC()          # 1. instantiate — set hyperparameters here
clf.fit(X_train, y_train)  # 2. learn parameters from data
y_pred = clf.predict(X_test)  # 3. apply
```

**Hyperparameters go in the constructor; parameters are learned by `fit`.** Attributes learned during `fit` end with an underscore (`clf.coef_`, `scaler.data_min_`) — if you see a trailing underscore, it did not exist before `fit` was called.

## Check yourself
1. What distinguishes a learned attribute from one you set? :: A trailing underscore. `coef_` is learned during `fit`; `C` is a hyperparameter you set in the constructor.
2. Does a clustering algorithm's `fit` take `y`? :: No — it is unsupervised, so `fit(X)` only.

@@ id=s1-svc-note | title=svm.SVC vs svm.LinearSVC | kind=concept | topic=S1 · Code recipes | tags=code,sklearn,models
The lab uses `svm.SVC()` with the line `#clf = svm.LinearSVC()` commented out just above it — an invitation to compare.

| | `SVC()` | `LinearSVC()` |
| --- | --- | --- |
| Boundary | non-linear by default (RBF kernel) | straight line only |
| Scales to large n | poorly | better |
| Kernel choice | yes, `kernel=` | no |

The lab's comment is the point worth remembering:

> the classifier is fitted using default hyperparameters. Note hyperparameters are usually needed to be optimised.

Defaults get you a working model, not a good one. Tuning is Week 2's business.

@@ id=s1-accuracy-first-metric | title=Evaluating with accuracy — and its limit | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,evaluation,exam
```python
from sklearn.metrics import accuracy_score

y_pred = clf.predict(X_test_scaled)
accuracy_score(y_test, y_pred)     # argument order: TRUE first, then predicted
```

**Argument order is `(y_true, y_pred)`.** Accuracy happens to be symmetric so a swap is invisible here — but precision, recall and the confusion matrix are not, and the habit carries.

The limit, which the shopper dataset demonstrates: with a target that is roughly 85% one class, predicting the majority every single time scores 85% accuracy while being useless. On imbalanced data, accuracy alone is not evidence of anything.

## Check yourself
1. What is the argument order for sklearn metrics? :: `(y_true, y_pred)` — truth first.
2. A model scores 85% accuracy on a dataset that is 85% negative. What have you learned? :: Nothing — that is exactly the score you get by always predicting the majority class. You need a baseline comparison and metrics that account for imbalance.

@@ id=s1-eda-plots | title=EDA plotting recipes | kind=cheatsheet | topic=S1 · Code recipes | tags=code,eda,matplotlib
```python
import matplotlib.pyplot as plt

# scatter, coloured by class
plt.scatter(X_train[:, 2], X_train[:, 3], c=y_train)
plt.xlabel("Petal length", fontsize=12)
plt.ylabel("Petal width", fontsize=12)

# one class at a time, so you control the markers
plt.plot(X_train[y_train==0, 2], X_train[y_train==0, 3], "bs")   # blue square
plt.plot(X_train[y_train==1, 2], X_train[y_train==1, 3], "g^")   # green triangle
plt.plot(X_train[y_train==2, 2], X_train[y_train==2, 3], "y*")   # yellow star
plt.legend(['setosa', 'versicolor', 'virginica'])
```

`X_train[y_train==0, 2]` is boolean-mask row selection plus column index — rows where the class is 0, column 2. This indexing pattern appears constantly and is worth being fluent in.

Pandas equivalents:

```python
df[['Administrative', 'Informational', 'ProductRelated']].describe()
df[['Administrative', 'Informational', 'ProductRelated']].boxplot()
df['Revenue'].value_counts().plot(kind='bar', title='Imbalance of Revenue')
df.plot(kind='scatter', x='BounceRates', y='ExitRates', color='blue')
```

@@ id=s1-missing-values-check | title=Checking for missing values | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,pandas,preprocessing
```python
df.isna().sum()          # count of missing per column
df.isna().sum().sum()    # total across the frame
df.isna().mean()         # proportion missing per column — often more useful
```

The shopper dataset has none, which the lab notes as "very helpful". Do not assume that of any other dataset — check first, every time. Week 2 covers what to do when the answer is not zero.

## Check yourself
1. Which call gives the proportion rather than the count of missing values per column? :: `df.isna().mean()`.

@@ id=s1-target-split | title=Splitting a DataFrame into X and y | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,pandas,exam
```python
x = df.drop(columns=['Revenue'])   # everything except the target
y = df.Revenue                     # or df['Revenue']
```

Two ways to reach a column: `df.Revenue` (attribute style — fails on names with spaces or that clash with methods) and `df['Revenue']` (always works). Prefer the brackets.

**The trap, straight out of the lab file:**

```python
x = df.drop('Revenue', 1)          # ✗ TypeError on pandas 2.x
x = df.drop(columns=['Revenue'])   # ✓ correct
```

Passing the axis positionally was deprecated and then removed. The lab has the broken line commented out directly above the working one — which tells you the marker knows about it.

## Check yourself
1. Why does `df.drop('Revenue', 1)` fail on modern pandas? :: Passing `axis` as a positional argument was removed. Use the `columns=` keyword.
2. When does `df.ColumnName` fail where `df['Column Name']` works? :: When the name contains spaces or special characters, or collides with an existing DataFrame method or attribute.

@@ id=s1-boolean-target | title=Converting a boolean target to 0/1 | kind=cheatsheet | topic=S1 · Code recipes | tags=code,pandas,preprocessing
The lab's version:

```python
df['Revenue'] = [1 if x == True else 0 for x in df['Revenue']]
```

Correct, but slow and wordy. Idiomatic equivalents:

```python
df['Revenue'] = df['Revenue'].astype(int)     # True → 1, False → 0
df['Revenue'] = df['Revenue'].map({True: 1, False: 0})
```

Always verify with `value_counts()` before and after — the lab does exactly this, and it is the right instinct:

```python
print(df['Revenue'].value_counts())
```

@@ id=s1-outliers-tukey | title=Finding outliers with the Tukey/IQR rule | kind=cheatsheet | topic=S1 · Code recipes | tags=code,eda,outliers
```python
def find_outliers_tukey(x):
    q1 = np.percentile(x, 25)
    q3 = np.percentile(x, 75)
    iqr = q3 - q1
    floor   = q1 - 1.5 * iqr
    ceiling = q3 + 1.5 * iqr
    outlier_indices = list(x.index[(x < floor) | (x > ceiling)])
    outlier_values  = list(x[outlier_indices])
    return outlier_indices, outlier_values
```

A point is an outlier if it falls more than $1.5 \times IQR$ below Q1 or above Q3, where $IQR = Q3 - Q1$. This is exactly what a boxplot's whiskers draw.

**The judgement call matters more than the formula.** In the lab, `Informational` produces *more* Tukey outliers than `ProductRelated` — because its upper quartile is 0, so any non-zero value is flagged. The lab's conclusion is the lesson:

> this exercise is not going to remove them as that would remove too much of the data, thus lowering the reliability of the model.

Detecting an outlier does not oblige you to delete it. A rule flagging a third of your rows is telling you the distribution is skewed, not that the data is wrong.

## Check yourself
1. State the Tukey outlier rule. :: Below $Q1 - 1.5 \times IQR$ or above $Q3 + 1.5 \times IQR$.
2. Why did `Informational` flag so many outliers? :: Its upper quartile is 0, so essentially every non-zero value falls outside the ceiling. The rule is a poor fit for a zero-inflated column.
3. When should you not remove flagged outliers? :: When they are too numerous to drop without losing information, or when they are genuine extreme behaviour rather than errors.

@@ id=s1-class-imbalance | title=Spotting class imbalance | kind=cheatsheet | topic=S1 · Code recipes | key | tags=code,imbalance,exam | cards=card-005
```python
df['Revenue'].value_counts()                  # raw counts
df['Revenue'].value_counts(normalize=True)    # proportions — read this one
df['Revenue'].value_counts().plot(kind='bar', title='Imbalance of Revenue')
```

The lab's finding on the shopper data: the target is heavily imbalanced, and so are `Browser`, `OperatingSystems` and `Weekend`. Its conclusion:

> data balancing method may need to be considered to balance the data.

Consequences to state in an exam answer:

1. **Accuracy stops being informative** — the majority-class baseline already scores high.
2. **Use `stratify=y`** when splitting, or a rare class may not appear in both halves.
3. Consider resampling or class weights.

**Calculate the balance; never assume it.**

## Check yourself
1. Which argument turns `value_counts()` into proportions? :: `normalize=True`.
2. Name three consequences of a heavily imbalanced target. :: Accuracy becomes misleading; splits need stratifying; the model may learn to ignore the minority class entirely.

@@ id=s1-correlation-heatmap | title=Correlation heatmap on mixed dtypes | kind=cheatsheet | topic=S1 · Code recipes | tags=code,eda,seaborn
```python
import seaborn as sns
import matplotlib.pyplot as plt

corr = df.select_dtypes(include='number').corr()   # numeric columns only

plt.figure(figsize=(10, 8))
sns.heatmap(corr, vmin=-1, vmax=1, cbar=True)
plt.show()
```

`df.corr()` on a frame containing text columns raises on modern pandas — `select_dtypes(include='number')` is the fix, and the lab's own updated cell shows exactly this repair.

Also worth keeping: the lab's caveat that a correlation heatmap **does not mean much for categorical variables** even when they are stored as integers. `OperatingSystems` coded 1–8 correlates with nothing meaningfully; the numbers are labels, not quantities.

## Check yourself
1. Why does `df.corr()` fail on the raw shopper frame? :: It contains non-numeric columns (`Month`, `VisitorType`). Restrict to numeric dtypes first.
2. Why is the correlation of an integer-coded categorical feature misleading? :: The integers are arbitrary labels with no order or magnitude, so a linear correlation coefficient has no meaning.
