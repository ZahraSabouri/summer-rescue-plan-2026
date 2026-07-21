@@ id=s1-debug-triage | title=Debugging triage: where to look first | kind=traps | topic=S1 · Debugging | key | tags=exam,debugging,strategy | cards=card-001
When exam code fails, resist reading it top to bottom. Work the five stages backwards from the error:

| Symptom | Stage at fault | First thing to check |
| --- | --- | --- |
| Crash on load | Get data | file path, delimiter, `header=` |
| `object` dtype where numbers expected | Get data | placeholder strings, `?`, thousands separators |
| Shape mismatch in `fit` | Split / preprocess | did you transform one half and not the other |
| Score suspiciously high | Preprocess | leakage — `fit` touched the test set |
| Score suspiciously low | Preprocess or model | did you forget to scale, or fit the model on unscaled data |
| Score changes every run | Split | missing `random_state` |
| Works, but predicts one class only | Data | class imbalance |

**Read the last line of the traceback first**, then the line number in *your* code — not inside the library.

## Check yourself
1. Accuracy jumps from 0.85 to 0.99 after a change to preprocessing. What is your first hypothesis? :: Leakage — the change probably let test data influence the fit, e.g. scaling before splitting or `fit_transform` on the test set.
2. Your score is different on every run. What is missing? :: `random_state` on `train_test_split` (and on any model with randomness).

@@ id=s1-trap-scale-before-split | title=Trap: scaling before splitting | kind=traps | topic=S1 · Debugging | key | tags=leakage,exam,debugging
```python
# ✗ WRONG — the scaler has already seen the test set
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y)

# ✓ RIGHT — split first, fit on train only
X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=42)
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)
```

The wrong version runs perfectly and gives a *better* score. That is what makes it dangerous: there is no error to see, only an inflated number that will not survive contact with real unseen data.

**Rule: split first. Nothing may be learned from data the model is not allowed to see.**

## Check yourself
1. Why is the leaky version harder to catch than a crash? :: It produces no error and a higher score, so it looks like an improvement rather than a bug.

@@ id=s1-trap-fit-transform-test | title=Trap: fit_transform on the test set | kind=traps | topic=S1 · Debugging | key | tags=leakage,exam,debugging
```python
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.fit_transform(X_test)   # ✗ refits on test
X_test_scaled  = scaler.transform(X_test)       # ✓
```

Two faults in one line: the test set influences its own transform, **and** the two halves end up on different scales, so the model receives inputs unlike anything it trained on.

Mnemonic: **fit once, transform many.**

@@ id=s1-trap-drop-axis | title=Trap: df.drop with a positional axis | kind=traps | topic=S1 · Debugging | tags=pandas,debugging,exam
```python
x = df.drop('Revenue', 1)          # ✗ TypeError on pandas 2.x
x = df.drop(columns=['Revenue'])   # ✓
x = df.drop('Revenue', axis=1)     # also works, but the keyword form is clearer
```

Present verbatim in the Lab 1 Ex2 notebook, commented out above the corrected line. If the test hands you an older notebook, this is a likely planted breakage.

@@ id=s1-trap-corr-mixed | title=Trap: .corr() on non-numeric columns | kind=traps | topic=S1 · Debugging | tags=pandas,debugging
```python
df.corr()                                     # ✗ raises on text columns
df.select_dtypes(include='number').corr()     # ✓
```

The shopper dataset has `Month` and `VisitorType` as strings. Same fix applies to `df.mean()`, `df.describe()` when you want numeric-only behaviour, and any aggregation that assumes numbers.

@@ id=s1-trap-split-order | title=Trap: unpacking train_test_split wrongly | kind=traps | topic=S1 · Debugging | key | tags=sklearn,debugging,exam
```python
# ✗ silently wrong — y_train now holds test features
X_train, y_train, X_test, y_test = train_test_split(X, y)

# ✓
X_train, X_test, y_train, y_test = train_test_split(X, y)
```

**All the X's, then all the y's.** The wrong version often does not crash immediately — it fails later with a confusing shape error, or trains on nonsense. If shapes look strange downstream, check this line.

## Check yourself
1. What is the correct unpacking order? :: `X_train, X_test, y_train, y_test`.

@@ id=s1-trap-numeric-categorical | title=Trap: integer-coded categories treated as numbers | kind=traps | topic=S1 · Debugging | key | tags=preprocessing,exam,debugging
`OperatingSystems`, `Browser`, `Region` and `TrafficType` in the shopper data are stored as integers, but they are **nominal**. Nothing in the file says so — you have to know it from the feature description.

Consequences if you miss it:

* correlation with them is meaningless;
* a linear model will read "Browser 8 is twice Browser 4";
* distance-based models (k-NN, SVM) will compute nonsense distances;
* they need **one-hot encoding**, not scaling.

The lab's own histogram comment flags this: the plot for `OperatingSystems` is "not exponential due to it being a categorical variable."

**Ask of every integer column: does arithmetic on this mean anything?** If not, it is categorical.

## Check yourself
1. Name the four integer-coded nominal features in the shopper dataset. :: `OperatingSystems`, `Browser`, `Region`, `TrafficType`.
2. What is the one-line test for whether an integer column is really numeric? :: Whether arithmetic on it is meaningful — is the average of two values a sensible thing?

@@ id=s1-trap-accuracy-imbalance | title=Trap: reporting accuracy on imbalanced data | kind=traps | topic=S1 · Debugging | key | tags=evaluation,imbalance,exam
The shopper target is roughly 85/15. A model that always predicts "no purchase" scores about 85% and has learned nothing.

Before quoting any accuracy, compute the baseline:

```python
df['Revenue'].value_counts(normalize=True).max()   # majority-class baseline
```

If your model does not clearly beat that number, it has no value — regardless of how respectable 85% looks.

## Check yourself
1. What is the majority-class baseline, and why quote it? :: The accuracy you get by always predicting the most common class. It is the floor any real model must beat, and without it an accuracy figure is uninterpretable.

@@ id=s1-trap-defaults | title=Trap: treating default hyperparameters as final | kind=traps | topic=S1 · Debugging | tags=modelling,exam
```python
clf = svm.SVC()      # defaults: RBF kernel, C=1.0, gamma='scale'
```

The lab comments this explicitly:

> Note hyperparameters are usually needed to be optimised.

Defaults are a starting point that proves the pipeline runs. If an exam task says "improve this model", tuning hyperparameters is one of the expected moves — along with better preprocessing and a fairer metric.

@@ id=s1-sanity-checklist | title=Sixty-second sanity checklist | kind=cheatsheet | topic=S1 · Debugging | key | tags=exam,checklist,recall | cards=card-001,card-005
Run this list over any pipeline before you trust a number it prints.

1. Did I look at `df.shape` and `df.info()`?
2. Did I check `df.isna().sum()`?
3. Is the target the right dtype, and did I check `value_counts()`?
4. **Did I split before preprocessing?**
5. Is `random_state` set?
6. Did the scaler `fit` on train only?
7. Did I transform the test set with the *same* fitted scaler?
8. Are categorical features encoded rather than scaled?
9. Is my metric appropriate for the class balance?
10. Did I compare against the majority-class baseline?

Items 4, 6 and 7 are the same underlying rule — **no information may flow from test to train** — and between them they account for most silently wrong results.

## Check yourself
1. Which three checklist items are really one rule, and what is it? :: 4, 6 and 7 — no information may flow from the test set into training. Split first, fit only on train, reuse that fitted transform.

@@ id=s1-exam-strategy | title=Working a code question under time pressure | kind=qa | topic=S1 · Debugging | key | tags=exam,strategy
The test is 1.5 hours plus 30 minutes upload, on a computer. Method matters as much as knowledge.

1. **Run the code before reading it.** The traceback tells you where to look faster than reading will.
2. **Locate the stage.** Which of the five is broken — get, know, process, model, evaluate?
3. **Change one thing, re-run.** Multiple simultaneous edits make it impossible to tell what fixed or broke it.
4. **Print shapes at boundaries.** `print(X_train.shape, X_test.shape, y_train.shape, y_test.shape)` catches a large class of bugs instantly.
5. **Prefer the smallest correct fix.** Rewriting someone's cell wastes time and loses marks for what was already right.
6. **If it runs but the number looks wrong, suspect leakage before suspecting the model.**
7. **Leave the upload window alone.** 30 minutes is for uploading, not for one more idea.

## Check yourself
1. What is the fastest single diagnostic to print after a split? :: The four shapes — `X_train`, `X_test`, `y_train`, `y_test`. Mismatches and mis-unpacking show up immediately.

@@ id=s1-shopper-dataset | title=The shopper dataset in one page | kind=cheatsheet | topic=S1 · Debugging | tags=lab,dataset | cards=card-005
`online_shoppers_intention.csv` — UCI Online Shoppers Purchasing Intention. The recurring worked example.

**Numeric features**

| Feature | Meaning |
| --- | --- |
| `Administrative`, `Informational`, `ProductRelated` | number of pages visited of each type |
| `*_Duration` | total seconds spent on each page type |
| `BounceRates` | % who enter on a page and leave without another request |
| `ExitRates` | % of pageviews to a page that were last in the session |
| `PageValues` | average value of a page visited before completing a transaction |
| `SpecialDay` | closeness of the visit to a special day; 1.0 at peak |

**Categorical features**: `OperatingSystems`, `Browser`, `Region`, `TrafficType`, `VisitorType` (New / Returning / Other), `Weekend` (bool), `Month`.

**Target**: `Revenue` — did the session end in a transaction.

Known properties, all of them exam-relevant: **no missing values**; **heavily imbalanced target**; several **integer-coded categoricals**; `ProductRelated_Duration` runs to nearly 17 hours; `PageValues` rises sharply with purchase likelihood, plausibly because it tracks reaching the payment page.

## Check yourself
1. What kind of ML problem is predicting `Revenue`? :: Supervised binary classification — the target exists and is categorical with two outcomes.
2. Name the property of this dataset that most affects how you evaluate a model on it. :: The heavy class imbalance, which makes plain accuracy misleading.
