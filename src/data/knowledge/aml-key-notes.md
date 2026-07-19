The one-page version of the full taxonomy note. If you can reproduce this table and the four rules underneath it from memory, you can answer any "what kind of problem is this" question in the exam.

## The only table you must memorise

| | Supervised | Unsupervised | Reinforcement |
| --- | --- | --- | --- |
| **Data** | $(X, y)$ — labelled | $X$ only — unlabelled | states, actions, rewards |
| **Learns** | $y = f(X)$ | structure in $P(X)$ | an action strategy |
| **Tasks** | classification, regression | clustering, anomaly detection | sequential decisions |
| **Output** | class label or number | groups or outlier flags | a policy |
| **CMT307 methods** | linear/logistic reg., SVM, k-NN, trees, NN, ensembles | k-means | none named yet |

Then one split inside supervised:

* target **categorical** → classification
* target **continuous** → regression

## The four rules that generate every answer

1. **Look for the target column.** Present → supervised. Absent → unsupervised. Rewards instead → reinforcement.
2. **Then look at the target's type.** Categorical → classification. Continuous → regression.
3. **The algorithm name tells you nothing about the task.** k-NN, SVM, trees and neural networks all do both. Logistic regression does classification despite its name.
4. **Deep learning is a model family, not a paradigm.** It sits inside ML and can be trained in any of the three settings.

## Five-second decision drill

```text
target column?  ──no──►  rewards?  ──yes──►  reinforcement
      │                     │
     yes                    no
      │                     │
      ▼                     ▼
 categorical?          clustering / anomaly detection
   yes → classification
   no  → regression
```

## Vocabulary that gets mixed up under pressure

| You see | It is a | Not a |
| --- | --- | --- |
| labelled / unlabelled | property of the **data** | learning paradigm |
| classification / regression | prediction **task** | algorithm |
| k-NN, SVM, decision tree | **algorithm** | task |
| deep learning | **model family** | supervision type |
| ensemble learning | **combination strategy** | standalone algorithm |
| preprocessing, train/test split | **workflow stage** | learning type |

## Lab 1 in one line

`Revenue` exists and is True/False → labelled + categorical → **binary supervised classification**. Check class balance from the data, never from intuition.

## Check yourself

1. State the three paradigms and the single question that separates the first two. :: Supervised, unsupervised, reinforcement. The separating question is whether a target $y$ is supplied for each training example.
2. Give one algorithm that appears in both the classification and regression lists, and say what decides which it is doing. :: k-NN (also SVM, decision trees, neural networks). The type of the target variable decides the task.
3. Where does deep learning sit in the hierarchy? :: Inside machine learning, which is inside AI. It is a model family, so it can be supervised, unsupervised or reinforcement depending on how it is trained.
4. You have transaction data with no fraud labels and want to find suspicious rows. Name the paradigm and task. :: Unsupervised learning, anomaly detection.
5. Which regression methods in CMT307 involve regularisation? :: Ridge, LASSO, and elastic net. LASSO can shrink coefficients to exactly zero; elastic net combines both penalties.
