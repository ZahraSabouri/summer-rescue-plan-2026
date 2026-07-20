@@ id=s1-data-objects | title=Data objects and attributes | kind=concept | topic=S1 · Data | key | tags=vocabulary,exam
A dataset is made of **data objects**; each object represents an entity.

| Concept | Also called | In a DataFrame |
| --- | --- | --- |
| Data object | point, sample, example, instance, object, tuple, vector, pattern | a **row** |
| Attribute | feature, variable, dimension, predictor | a **column** |

> rows → data objects; columns → attributes

Both lists of synonyms are examinable. Slides, textbooks and sklearn docs switch between them constantly, so read them as interchangeable.

## Check yourself
1. Give four names for a single row of a dataset. :: Any four of: data object, point, sample, example, instance, object, tuple, vector, pattern.
2. Give four names for a column. :: Attribute, feature, variable, dimension, predictor.

@@ id=s1-attribute-types | title=The four attribute types | kind=concept | topic=S1 · Data | key | tags=vocabulary,exam,preprocessing
| Type | Definition | Examples |
| --- | --- | --- |
| **Nominal** | categories, states, "names of things" — no order | hair colour, marital status, occupation, ID numbers, post codes |
| **Binary** | nominal with only 2 states (0/1) | see the symmetric/asymmetric note |
| **Ordinal** | values have a meaningful **order**, but the gap between them is unknown | size {small, medium, large}, grades, army rankings |
| **Numeric** | quantitative, measurable | mass, height, temperature |

Nominal, binary and ordinal are together the **categorical** features.

The one that catches people: **ordinal has order but not distance.** You know large > medium, but not by how much — so you cannot average them meaningfully, and encoding them as 1/2/3 quietly asserts equal spacing.

## Check yourself
1. Why are post codes nominal rather than numeric, despite containing digits? :: Because the digits identify a place, they do not measure a quantity. Arithmetic on them is meaningless.
2. What does ordinal have that nominal lacks, and what does it still lack? :: It has a meaningful ranking; it lacks a known magnitude between successive values.

@@ id=s1-binary-symmetric | title=Symmetric vs asymmetric binary | kind=traps | topic=S1 · Data | tags=vocabulary,exam
A binary attribute is nominal with two states, but the two kinds are treated differently:

| Kind | Meaning | Example |
| --- | --- | --- |
| **Symmetric** | both outcomes equally important | gender |
| **Asymmetric** | outcomes not equally important | medical test, positive vs negative |

**Convention: assign 1 to the most important outcome** — e.g. HIV positive = 1.

This is not pedantry. It decides which class counts as "positive" in precision/recall later, and getting it backwards inverts your metrics.

## Check yourself
1. In an asymmetric binary attribute, which outcome gets the 1? :: The most important / rarer one — e.g. the positive medical result.

@@ id=s1-discrete-continuous | title=Discrete vs continuous attributes | kind=concept | topic=S1 · Data | tags=vocabulary,exam
| | Discrete | Continuous |
| --- | --- | --- |
| Values | finite or countably infinite set | real numbers |
| Examples | zip codes, profession, the set of words in a document collection | temperature, height, weight |
| Stored as | often integer variables | floating point |

Two details the slides call out:

* **Binary attributes are a special case of discrete attributes.**
* Continuous values can practically only be measured and stored to a finite number of digits — "continuous" is a modelling assumption, not a property of the file.

@@ id=s1-dataset-types | title=Types of data set | kind=cheatsheet | topic=S1 · Data | tags=vocabulary
| Family | Members |
| --- | --- |
| **Record** | relational records; data matrix (numerical matrix, crosstabs); document data (text, term-frequency vector); transaction data |
| **Graph and network** | World Wide Web; social or information networks; molecular structures |
| **Ordered** | video (sequence of images); temporal / time series; sequential (transaction sequences); genetic sequence data |
| **Spatial, image, multimedia** | maps; pictures; video clips and films |

Everything in Part 1 of this module is **record** data — specifically a data matrix, which is what a `DataFrame` holds. The rest is context for later.

@@ id=s1-structured-data-characteristics | title=Four characteristics of structured data | kind=concept | topic=S1 · Data | key | tags=vocabulary,exam
| Characteristic | The issue | One-line consequence |
| --- | --- | --- |
| **Dimensionality** | curse of dimensionality | as features grow, data becomes sparse and distances stop being informative |
| **Sparsity** | only presence counts | most entries are zero; store and compare only the non-zeros |
| **Resolution** | patterns depend on the scale | a pattern visible per-hour may vanish per-month, and vice versa |
| **Distribution** | centrality and dispersion | where the data sits and how spread out it is drives which model and which scaling |

These four are a tidy exam answer to "what should you look at before choosing an algorithm?"

## Check yourself
1. State the curse of dimensionality in one sentence. :: As the number of attributes grows, the space grows exponentially, data becomes sparse within it, and distance-based reasoning degrades.
2. Which characteristic explains why a pattern can appear at one time-granularity and disappear at another? :: Resolution.

@@ id=s1-tabular-shape | title=Reading a tabular dataset correctly | kind=cheatsheet | topic=S1 · Data | key | tags=lab,code,pandas
The fruit dataset in the slides is the model of what tabular data looks like: one row per fruit, columns for `mass`, `height`, `width`, and a label column.

First four things to run on any new table, in this order:

```python
df.shape          # (rows, columns) — do you have what you expected?
df.head(5)        # what do the values actually look like?
df.info()         # dtypes and non-null counts in one view
df.describe()     # ranges, means, obvious nonsense values
```

`df.info()` is the highest-value single call: it gives you column names, dtypes and missing-value counts together. If a numeric column shows as `object`, something is wrong with the file — that is a preprocessing job, not a modelling one.

## Check yourself
1. Which single pandas call shows dtypes and non-null counts together? :: `df.info()`.
2. A column you expect to be numeric shows dtype `object`. What does that tell you? :: Non-numeric values are present — stray text, a placeholder like `?`, or thousands separators. It must be cleaned before modelling.

@@ id=s1-decision-surface | title=Decision surface | kind=concept | topic=S1 · Foundations | tags=intuition
The slides introduce classification visually: plot two features against each other, colour points by class, and the model's job is to draw the **decision surface** — the boundary separating regions the model assigns to different classes.

Useful mental image for the rest of the module:

* a **linear** model can only draw a straight boundary;
* **k-NN** draws a jagged boundary that follows the data;
* **SVM** draws the boundary with the widest margin;
* a **decision tree** draws axis-parallel rectangles.

When a model underperforms, ask what shape of boundary it is *able* to draw, and whether the data needs a different one.

@@ id=s1-python-stack | title=The library stack, and what each is for | kind=cheatsheet | topic=S1 · Practical | key | tags=code,tools
**Essentials for this module**

| Library | Purpose |
| --- | --- |
| `sklearn` (scikit-learn) | machine learning — models, preprocessing, metrics, splitting |
| `keras` (TensorFlow) | high-level API for deep learning (Part 2) |
| `numpy` | mathematical functions, vectors, arrays |

**Very useful**

| Library | Purpose |
| --- | --- |
| `pandas` | data analysis, the `DataFrame` |
| `matplotlib` | visualisation |
| `pytorch` | deep learning library |
| `NLTK` | statistical text processing |
| `spaCy` | natural language processing |
| `gensim` | vectors, topic modelling |

Environment: **Google Colab** — free Jupyter notebooks in the cloud, all the libraries preinstalled, Google Drive for storage, free GPU time. This is the environment the practicals and the test assume.

@@ id=s1-import-recall | title=Imports you must be able to type from memory | kind=cheatsheet | topic=S1 · Practical | key | tags=code,exam,recall
In a timed computer test you cannot afford to look these up.

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn import datasets, svm
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.metrics import accuracy_score
```

Note the shapes: **`sklearn.model_selection`** for splitting, **`sklearn.preprocessing`** for scalers, **`sklearn.metrics`** for scores. Getting the submodule wrong is the most common import error.

## Check yourself
1. Which sklearn submodule holds `train_test_split`? :: `sklearn.model_selection`.
2. Which holds `MinMaxScaler`? :: `sklearn.preprocessing`.
3. Which holds `accuracy_score`? :: `sklearn.metrics`.
