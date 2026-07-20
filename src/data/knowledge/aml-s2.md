@@ id=s2-why | title=Why preprocessing dominates the work | kind=concept | topic=S2 · Foundations | key | tags=preprocessing,exam | cards=card-007
The session's opening claim, and a quotable exam line:

> No quality data, no quality modelling results. Quality decisions must be based on quality data.

**Data preparation, cleaning and transformation comprise the majority of the work in a machine learning application.** Duplicate or missing data cause incorrect or even misleading statistics.

This is why Week 2 exists and why most planted faults in a code test live here rather than in the model.

@@ id=s2-dirty-data | title=Three ways real data is dirty | kind=concept | topic=S2 · Foundations | key | tags=validation,exam
| Problem | Meaning | Slide example |
| --- | --- | --- |
| **Incompleteness** | missing attribute values, missing attributes of interest, or only aggregate data | `Postcode = ""` |
| **Noise** | erroneous or anomalous values — outliers | `age = -2` |
| **Inconsistency** | discrepancies between fields that should agree | `Age="52"` with `Birthday="01/01/1991"` |

Note that **inconsistency is invisible to `isna()`**. Nothing is missing and nothing is out of range; two fields simply contradict each other. Only a domain check finds it.

## Check yourself
1. Name the three data-validation problems with an example of each. :: Incompleteness (empty postcode), noise (age = -2), inconsistency (age 52 but birthday in 1991).
2. Which of the three will `df.isna().sum()` not detect? :: Noise and inconsistency. Both are present values — one implausible, one contradictory.

@@ id=s2-noise-sources | title=Where noise comes from | kind=concept | topic=S2 · Foundations | tags=validation
**Noise: random error or variance in a measured variable.**

Incorrect attribute values may be due to:

* faulty data collection instruments;
* data entry problems;
* data transmission problems.

Other problems requiring cleaning: **duplicate records, incomplete data, inconsistent data**.

Useful because it tells you *where to look*: a sensor column with impossible values is an instrument problem; a text column with three spellings of the same category is a data-entry problem.

@@ id=s2-eda-scatter | title=Scatter plot and correlation | kind=concept | topic=S2 · Inspection | tags=eda
Provides a first look at **bivariate** data — clusters of points, outliers, relationships. Each pair of values is treated as coordinates and plotted in the plane.

Four shapes to recognise on sight:

| Pattern | Correlation coefficient |
| --- | --- |
| Positively correlated | towards +1 |
| Negatively correlated | towards −1 |
| Nonlinearly correlated | near 0 despite a clear relationship |
| Uncorrelated | near 0 |

Correlation coefficient ranges over $[-1, 1]$.

**The trap is the third row.** A strong curved relationship can have a correlation near zero. A low correlation coefficient means no *linear* relationship — not no relationship. Always plot before trusting the number.

## Check yourself
1. A feature pair has correlation 0.02 but the scatter plot shows a clear U shape. What do you conclude? :: There is a strong nonlinear relationship. Correlation only measures linear association, so it misses this entirely.

@@ id=s2-eda-histogram | title=Histogram | kind=concept | topic=S2 · Inspection | tags=eda
A graphical display of tabulated **frequencies**, shown as bars. The x-axis holds values, the y-axis frequencies. It shows what proportion of cases fall into each of several categories.

Categories are usually specified as **non-overlapping intervals** of some variable, and the bars must be **adjacent** — that adjacency is what distinguishes a histogram from a bar chart, which shows unrelated categories with gaps.

@@ id=s2-boxplot | title=Boxplot and the five-number summary | kind=concept | topic=S2 · Inspection | key | tags=eda,exam,outliers
**Five-number summary of a distribution:** Minimum, Q1, Median, Q3, Maximum.

The boxplot draws it:

| Element | What it shows |
| --- | --- |
| Box ends | first and third quartiles — box height is the **IQR** |
| Line in box | the median |
| Whiskers | extend to $Q1 - 1.5 \times IQR$ and $Q3 + 1.5 \times IQR$ |
| Points beyond whiskers | **outliers**, plotted individually |

This is the same rule as the Tukey outlier function from Lab 1 — the boxplot is that rule drawn.

## Check yourself
1. What does the height of the box represent? :: The interquartile range, $IQR = Q3 - Q1$.
2. Where do the whiskers end? :: At $Q1 - 1.5 \times IQR$ and $Q3 + 1.5 \times IQR$; anything beyond is plotted as an individual outlier.

@@ id=s2-transformation-types | title=Five kinds of data transformation | kind=cheatsheet | topic=S2 · Transformation | tags=preprocessing,exam
| Transformation | What it does |
| --- | --- |
| **Smoothing** | remove noise — binning, clustering, regression |
| **Scaling** | map to a small specified range: −1 to 1, 0 to 1, or $N(0,1)$ |
| **Attribute/feature construction** | build new attributes from existing ones |
| **Aggregation** | summarise or aggregate |
| **Generalization** | concept hierarchy climbing — replace raw values with higher-level concepts |

Generalization is the one people forget: replacing a precise street address with a city, or an exact age with a band. It reduces detail deliberately.

@@ id=s2-why-scale | title=Why feature scaling matters | kind=concept | topic=S2 · Transformation | key | tags=scaling,exam | cards=card-005
The range of values of raw data varies widely; scaling gives all features the same range. Three reasons from the slides, each worth quoting:

1. **Necessary for distance/similarity-based ML methods** — k-NN, SVM. An unscaled feature with a large range dominates the distance.
2. **Faster convergence for gradient-descent algorithms.**
3. **Appropriately penalising coefficients in loss functions involving regularisation** — otherwise the penalty falls unevenly across features.

The mirror-image fact, from Session 4: **decision trees need no scaling at all.** They split on one feature at a time, so the units never interact.

## Check yourself
1. Give three reasons to scale features. :: Distance-based methods need comparable ranges; gradient descent converges faster; regularisation penalties are only fair on comparable scales.
2. Which model family in this module does not need scaling, and why? :: Decision trees (and forests). They split one feature at a time, so relative scale never enters the comparison.

@@ id=s2-minmax-zscore | title=Min-max vs z-score normalisation | kind=cheatsheet | topic=S2 · Transformation | key | tags=scaling,exam,formula
**Min-max normalisation** maps $X$ from its original range $[\min, \max]$ to a new range $[new_{min}, new_{max}]$:

$$x' = new_{min} + (x - \min) \times \dfrac{new_{max} - new_{min}}{\max - \min}$$

Worked example from the slides: normalising $(9, 22, 14, 2, 11)$ to $[-1, 1]$ gives $(-0.3,\ 1.0,\ 0.2,\ -1.0,\ -0.1)$.

**z-score normalisation (standardisation)**:

$$x' = \dfrac{x - \mu}{\sigma}$$

| | sklearn class | Function form |
| --- | --- | --- |
| min-max | `sklearn.preprocessing.MinMaxScaler` | `minmax_scale` |
| z-score | `sklearn.preprocessing.StandardScaler` | `scale` |

**Choosing:** min-max when you need a bounded range and outliers are mild — it is sensitive to extremes, since one huge value squashes everything else. z-score when the feature is roughly normal or outliers are present.

## Check yourself
1. Write the z-score formula. :: $x' = (x - \mu) / \sigma$.
2. Why is min-max sensitive to outliers? :: The mapping is defined by the min and max, so a single extreme value stretches the range and compresses every other point into a narrow band.

@@ id=s2-missing-four-strategies | title=Four strategies for missing data | kind=concept | topic=S2 · Missing data | key | tags=preprocessing,exam | cards=card-007
| Strategy | What it means |
| --- | --- |
| **Elimination** | discard records with missing values in one or more attributes |
| **Inspection** | a domain expert examines each missing value and recommends a substitute |
| **Identification** | use a conventional value to encode "missing", so records need not be removed |
| **Imputation** | replace missing data with substituted values, e.g. the attribute mean |

**The one hard rule:** in supervised learning it is *essential* to eliminate a record if the value of the **target** attribute is missing. You cannot learn from an example whose answer is unknown, and you cannot invent it.

The slides' caution on imputation is worth keeping: several criteria exist but **most of them appear somehow arbitrary**. Imputing the mean is a decision, not a neutral act.

## Check yourself
1. Name the four strategies. :: Elimination, inspection, identification, imputation.
2. When is deleting a row not optional? :: When the target value is missing in supervised learning.
3. Why is "identification" different from imputation? :: It marks the value as missing with a conventional code rather than guessing a plausible value, keeping the record without inventing data.

@@ id=s2-missing-practical | title=Missing data: the four practical options | kind=cheatsheet | topic=S2 · Missing data | key | tags=code,preprocessing,exam
The Titanic slide states the options operationally:

1. Get rid of the corresponding **instances** (rows).
2. Get rid of the whole **attribute** (column).
3. Set the values to some value — zero, the mean, the median.
4. Use **imputation** methods — `sklearn.impute`.

```python
from sklearn.impute import SimpleImputer

SimpleImputer(strategy='mean')            # numeric, symmetric distribution
SimpleImputer(strategy='median')          # numeric, skewed or outlier-prone
SimpleImputer(strategy='most_frequent')   # categorical
SimpleImputer(strategy='constant', fill_value='missing')
```

The Lab 2 solution's choices are the ones to copy: **median for numeric, most_frequent for categorical.** Median over mean because it is robust to the outliers that real data always carries.

## Check yourself
1. Which imputation strategy works on categorical columns? :: `most_frequent` (or `constant` with a fill value). Mean and median require numbers.
2. Why does Lab 2 use median rather than mean for the numeric columns? :: The median is robust to outliers, which would drag the mean away from a typical value.

@@ id=s2-encoding-ordinal | title=Encoding ordinal features | kind=concept | topic=S2 · Encoding | key | tags=encoding,exam
Ordinal features have a meaningful order, so **label/integer encoding** preserves information:

```python
from sklearn.preprocessing import OrdinalEncoder
```

Also `category_encoders.ordinal.OrdinalEncoder`.

The slides' example maps `Pclass` — Third/First/Second class — to 2/0/1, and `Degree` — BSc, No degree, PhD, MSc — to integers.

**The judgement:** integer encoding asserts both order *and* equal spacing. For `Pclass` that is defensible. For `Degree`, is the gap from BSc to MSc the same as MSc to PhD? Encoding it as 1, 2, 3 says yes.

## Check yourself
1. When is integer encoding appropriate? :: When the feature is genuinely ordinal — the order carries meaning the model should use.
2. What does integer encoding silently assume beyond order? :: Equal spacing between consecutive levels.

@@ id=s2-encoding-onehot | title=One-hot encoding for nominal features | kind=cheatsheet | topic=S2 · Encoding | key | tags=encoding,exam,code | cards=card-007
**Create a new binary feature to represent each of the categories.** For nominal data with no order, this is the correct default.

```python
from sklearn.preprocessing import OneHotEncoder
OneHotEncoder(handle_unknown='ignore')   # Lab 2's setting
```

Also `category_encoders.one_hot.OneHotEncoder`, and in pandas `pd.get_dummies(df, columns=[...])`.

The slides encode `Sex` → `Female`/`Male` columns and `Embarked` → `C`/`Q`/`S` columns.

**`handle_unknown='ignore'` matters.** Without it, a category that appears in the test set but not the training set raises at predict time. With it, the unseen category encodes as all zeros. In a train/test split, that situation is common — which is exactly why Lab 2 sets it.

## Check yourself
1. Why one-hot rather than integer encoding for a nominal feature? :: Integers impose a false order and false distances on categories that have neither.
2. What does `handle_unknown='ignore'` prevent? :: An error at predict time when the test set contains a category never seen during fit; it encodes as all zeros instead.

@@ id=s2-encoding-binary | title=Binary encoding for high-cardinality features | kind=concept | topic=S2 · Encoding | tags=encoding
The categorical feature is first converted to numbers with an ordinal encoder; the numbers are then written in **binary**; the binary value is split across columns.

**Binary encoding works really well when there are a high number of categories** — occupations, for example.

The size argument is the point:

> a feature with up to 64 categories needs only 6 bits to encode using binary encoding.

One-hot on 64 categories costs 64 columns. Binary costs 6. The trade-off is interpretability — a one-hot column means something, a bit column does not.

`category_encoders.binary.BinaryEncoder`

## Check yourself
1. How many columns does binary encoding need for 64 categories, and how many would one-hot need? :: 6 versus 64.
2. What do you give up by using binary encoding? :: Interpretability — individual bit columns carry no meaning — and the clean independence that one-hot columns have.

@@ id=s2-encoding-picker | title=Which encoder? | kind=cheatsheet | topic=S2 · Encoding | key | tags=encoding,recall,exam
```text
Does the category have a meaningful order?
│
├── yes → ordinal / label encoding (integers preserve the order)
│
└── no  → how many distinct categories?
          │
          ├── few  → one-hot encoding (one binary column each)
          │
          └── many → binary encoding (log2 columns, e.g. 64 → 6)
```

Then remember the model-side fact from Session 5: **tree-based methods handle categorical features straightforwardly**, while SVM, neural networks and k-NN **require numeric input and usually scaling too**.

@@ id=s2-imbalanced | title=Imbalanced data: over- and undersampling | kind=concept | topic=S2 · Imbalanced data | key | tags=imbalance,exam | cards=card-007
**Imbalanced data refers to classification problems where the class distribution is not uniform among the classes.** Typically two classes: the **majority (negative)** class and the **minority (positive)** class.

| Method | What it does | Risk |
| --- | --- | --- |
| **Oversampling** | appends data to the minority class, e.g. **SMOTE** (Synthetic Minority Over-sampling Technique) | can overfit the synthetic minority points |
| **Undersampling** | removes data from the majority class | throws away real information |

Package: **`imblearn`** — `pip install imbalanced-learn`.

Session 3 adds two more responses beyond resampling: **altering the prediction threshold** using probability calibration and the AUC-ROC curve, and **cost-sensitive learning** — weighting classes so the minority gets a larger weight.

## Check yourself
1. Which class is conventionally the "positive" one in an imbalanced problem? :: The minority class.
2. What does SMOTE stand for and which side does it operate on? :: Synthetic Minority Over-sampling Technique — it adds synthetic examples to the minority class.
3. Name two responses to imbalance that are not resampling. :: Threshold adjustment via probability calibration/AUC-ROC, and cost-sensitive learning with class weights. (Anomaly-detection framing is a third.)

@@ id=s2-data-reduction | title=Data reduction and its three criteria | kind=concept | topic=S2 · Data reduction | tags=exam,vocabulary
**Data reduction obtains a reduced representation of the dataset that is much smaller in volume but yet produces the same (or almost the same) analytical results.**

Three criteria for judging it:

| Criterion | Why it counts |
| --- | --- |
| **Efficiency** | a smaller dataset usually means shorter computational time |
| **Accuracy** | the accuracy of the generated models is the critical success factor |
| **Simplicity** | models should translate into simple rules that domain experts can understand |

## Check yourself
1. State the three data-reduction criteria. :: Efficiency, accuracy, simplicity.

@@ id=s2-reduction-ways | title=Three ways to reduce data | kind=cheatsheet | topic=S2 · Data reduction | key | tags=exam
| Way | What it removes or changes | Picture |
| --- | --- | --- |
| **Feature selection** | eliminates a subset of **variables** not deemed relevant | drops columns |
| **Instance (pattern) selection** | selects a subset of **patterns** that sufficiently represent the original data | drops rows |
| **Data transformation** | transforms data into a new space so it can be informatively represented in **lower dimension** | replaces the axes |

The distinction is examinable: feature selection **keeps a subset of the original columns**; data transformation (PCA) **creates new columns** that are combinations of the originals. Only the first leaves you able to say "we used these five features".

## Check yourself
1. What is the difference between feature selection and dimensionality reduction by PCA? :: Feature selection keeps a subset of the original, interpretable features. PCA builds new components as combinations of all features, which are lower-dimensional but no longer directly interpretable.
2. Which of the three drops rows rather than columns? :: Instance/pattern selection.

@@ id=s2-feature-selection-methods | title=Feature selection: filter, embedded, wrapper | kind=concept | topic=S2 · Data reduction | key | tags=exam,feature-selection
First split — by whether labels are used:

* **Unsupervised**: uses unlabelled data only, e.g. remove sparse or low-variance features, or use entropy.
* **Supervised**: uses the output labels to remove features that are not relevant or do not improve model performance.

Supervised methods then split three ways:

| Method | How it works | Examples |
| --- | --- | --- |
| **Filter** | statistical tests score each feature independently of any model | chi-squared test, correlation |
| **Embedded** | learns the relevant features *while the model is being created*; regularisation is the most common technique | **LASSO**, Ridge regression, SMLR |
| **Wrapper** | treats feature selection as a **search problem** over subsets | forward/backward selection, Recursive Feature Elimination |

`sklearn.feature_selection`

**The link to Session 3:** LASSO is listed here as an *embedded* feature-selection method, because its L1 penalty drives coefficients to exactly zero. Regularisation and feature selection are the same act.

## Check yourself
1. Name the three families of supervised feature selection. :: Filter, embedded, wrapper.
2. Which family does LASSO belong to and why? :: Embedded — it selects features as a side effect of training, by shrinking irrelevant coefficients to zero.
3. Which family is most expensive and why? :: Wrapper — it searches over subsets of features, retraining the model for each candidate subset.

@@ id=s2-dimensionality-reduction | title=Dimensionality reduction by transformation | kind=concept | topic=S2 · Data reduction | tags=pca
| Approach | Idea | sklearn |
| --- | --- | --- |
| **Principal component analysis** | linear projection onto directions of greatest variance | `sklearn.decomposition.PCA`, `KernelPCA` |
| **Manifold learning** | non-linear dimensionality reduction | `sklearn.manifold`; UMAP via `umap-learn` |

PCA also reappears in Session 4 as the fix for a decision tree's weakness: tree splits are perpendicular to an axis, so trees are sensitive to rotation of the training set, and **PCA can give the data a better orientation**.

@@ id=s2-sklearn-model-flow | title=The sklearn workflow diagram | kind=cheatsheet | topic=S2 · Code recipes | key | tags=sklearn,exam,pipeline
The session ends with the flow that every later lab follows:

```text
                Data
                 │
        Train / test split
                 │
          Pre-processing        estimator.fit()  /  estimator.transform()
                 │
          Define model
                 │
   Model training & optimisation   estimator.fit()
                 │
   Model evaluation & selection    estimator.predict()
```

The two-column detail is the examinable bit: **transformers** use `fit()` then `transform()`; **models** use `fit()` then `predict()`. Same `fit`, different second verb.

## Check yourself
1. What comes immediately after "Data" in the flow, and why does the order matter? :: Train/test split — before preprocessing, so nothing learned from the test set can leak into the transform.

@@ id=s2-columntransformer | title=Pipeline + ColumnTransformer: the exam-critical pattern | kind=cheatsheet | topic=S2 · Code recipes | key | tags=code,sklearn,exam,leakage | cards=card-005,card-008
The Lab 2 solution in full. **Learn this shape** — it handles mixed dtypes, imputes, encodes, scales, and makes leakage structurally impossible.

```python
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, MinMaxScaler
from sklearn.compose import ColumnTransformer

categorical_features = ['A1', 'A4', 'A5', 'A6', 'A7', 'A9', 'A10', 'A12', 'A13']
categorical_transformer = Pipeline([
    ('imputer_cat', SimpleImputer(strategy='most_frequent')),
    ('onehot', OneHotEncoder(handle_unknown='ignore')),
])

numeric_features = ['A2', 'A3', 'A8', 'A11', 'A14', 'A15']
numeric_transformer = Pipeline([
    ('imputer_num', SimpleImputer(strategy='median')),
    ('scaler', MinMaxScaler()),
])

preprocessor = ColumnTransformer([
    ('categoricals', categorical_transformer, categorical_features),
    ('numericals',   numeric_transformer,     numeric_features),
], remainder='drop')
```

Then the whole thing becomes one estimator:

```python
from sklearn.neighbors import KNeighborsClassifier

myClassifier = Pipeline([
    ('preprocessing', preprocessor),
    ('classifier', KNeighborsClassifier()),
])

myClassifier.fit(X_train, y_train)
y_pred = myClassifier.predict(X_test)
```

**Why this is the answer to leakage:** `Pipeline.fit` calls `fit_transform` on every step using training data only, and `Pipeline.predict` calls `transform` — never `fit` — on the test data. You cannot leak by accident. The same object also drops into cross-validation and `GridSearchCV` correctly.

## Check yourself
1. Why does a Pipeline prevent leakage automatically? :: `fit` fits the transformers on training data only; `predict` only transforms. The wrong call is not reachable.
2. What does `remainder='drop'` do? :: Any column not named in a transformer is discarded rather than passed through untouched.
3. Why must categorical and numeric columns go through separate branches? :: They need different treatment — most-frequent imputing plus one-hot for categoricals, median imputing plus scaling for numerics.

@@ id=s2-crx-cleaning | title=Cleaning the credit-approval data | kind=cheatsheet | topic=S2 · Code recipes | key | tags=code,pandas,lab
The first half of Lab 2, and a perfect example of "the file lies about its dtypes".

```python
import pandas as pd
import numpy as np

crx = pd.read_csv('crx.data.txt', header='infer')
crx.columns = ['A1','A2','A3','A4','A5','A6','A7','A8',
               'A9','A10','A11','A12','A13','A14','A15','Target']

print(crx.shape); print(crx.head()); print(crx.info()); print(crx.describe())

# '?' is this file's missing marker — pandas has no idea
crx.replace(to_replace='?', value=np.nan, inplace=True)

# A2 and A14 were read as object because of the '?' characters
crx[['A2', 'A14']] = crx[['A2', 'A14']].astype(float)
crx.info()          # confirm the dtypes actually changed
```

**The lesson generalises.** A numeric column arriving as `object` almost always means a placeholder string: `?`, `NA`, `-`, `unknown`, `n/a`. Find it, convert it to `np.nan`, then cast. `df.info()` before and after is the check.

## Check yourself
1. Why did `A2` load with dtype `object`? :: It contains `?` characters as missing markers, so pandas could not parse the column as numeric.
2. What are the two steps to fix it? :: Replace the placeholder with `np.nan`, then `.astype(float)`.
3. How would you find the placeholder in an unfamiliar file? :: Inspect the unique values of the offending object column, e.g. `df['A2'].unique()`, and look for non-numeric tokens.

@@ id=s2-trap-placeholder-missing | title=Trap: missing values that isna() cannot see | kind=traps | topic=S2 · Debugging | key | tags=debugging,pandas,exam
```python
df.isna().sum()      # reports 0 missing — and is wrong
```

If the file encodes missing as `?`, `NA`, `-99`, `unknown` or an empty string, pandas sees a perfectly good value. Your missing-data count is zero and your numeric column is dtype `object`.

Diagnosis, in order:

```python
df.info()                       # numeric column showing 'object'? suspicious
df['A2'].unique()[:20]          # look at what is actually in there
df.replace('?', np.nan, inplace=True)
df['A2'] = df['A2'].astype(float)
```

**A zero from `isna()` is only trustworthy once the dtypes are right.**

## Check yourself
1. `isna().sum()` returns all zeros but a numeric column has dtype object. What is going on? :: The column contains a non-numeric placeholder standing in for missing values, which pandas counts as present data.

@@ id=s2-trap-encode-before-split | title=Trap: fitting an encoder or imputer before splitting | kind=traps | topic=S2 · Debugging | key | tags=leakage,debugging,exam
The leakage rule is not only about scalers. **Every transformer that learns something from data can leak.**

| Transformer | What it learns from the data | Leaks if fitted on everything |
| --- | --- | --- |
| `MinMaxScaler` | min and max | test extremes shape the transform |
| `StandardScaler` | mean and sd | test distribution shapes the transform |
| `SimpleImputer` | the mean/median/mode | test values contribute to the fill value |
| `OneHotEncoder` | the set of categories | test-only categories become known columns |
| `PCA` | the component directions | test variance shapes the axes |

```python
# ✗ imputer has seen the test set's values
df = df.fillna(df.mean())
X_train, X_test, ... = train_test_split(...)

# ✓ split first, then fit inside a Pipeline
X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=42)
pipe = Pipeline([('prep', preprocessor), ('clf', KNeighborsClassifier())])
pipe.fit(X_train, y_train)
```

## Check yourself
1. Name three transformers other than a scaler that can leak. :: `SimpleImputer`, `OneHotEncoder`, `PCA` (also feature selectors that use the target).
2. What is the single structural fix? :: Put every transformer inside a `Pipeline` and fit the pipeline on the training split only.

@@ id=s2-trap-onehot-unseen | title=Trap: unseen categories at predict time | kind=traps | topic=S2 · Debugging | tags=encoding,debugging
```python
OneHotEncoder()                          # ✗ raises on a category not seen in fit
OneHotEncoder(handle_unknown='ignore')   # ✓ encodes it as all zeros
```

Error looks like: `Found unknown categories [...] in column N during transform`.

It surfaces at `predict`, not `fit`, so it appears long after the mistake — a classic "worked in the notebook, broke on new data" fault. Lab 2 sets `handle_unknown='ignore'` for exactly this reason.

@@ id=s2-trap-scaling-choice | title=Trap: scaling the wrong things | kind=traps | topic=S2 · Debugging | key | tags=scaling,debugging,exam
Three mistakes that all run without error:

1. **Scaling one-hot columns.** Already 0/1 — scaling is pointless and, with MinMax, a no-op that just adds confusion. Scale numeric branches only, which is why `ColumnTransformer` splits them.
2. **Scaling the target `y`.** For regression this changes the units of your error metric, so an RMSE of 0.03 means nothing until you invert it. Scale `y` only deliberately, and remember to invert before reporting.
3. **Scaling before imputing.** The scaler must not meet `NaN`. Order inside the numeric branch is **impute, then scale** — exactly the order in Lab 2.

## Check yourself
1. What is the correct order of imputing and scaling, and why? :: Impute first, then scale. A scaler cannot compute statistics over missing values.
2. Why does scaling `y` in a regression make your RMSE hard to read? :: It is then expressed in scaled units, not the original ones, so it must be inverted before it means anything.
