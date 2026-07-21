@@ id=s1-what-is-ml | title=What machine learning is | kind=concept | topic=S1 · Foundations | key | tags=definition,exam | cards=card-001
Algorithms that **learn a model from data** to find patterns and relationships, then **generalise to unseen data** — performing the task without explicit instructions.

The whole field in one line:

$$y = f(X)$$

* $X$ — input (features, attributes)
* $f$ — the model, learned from data
* $y$ — output (target, label)

Everything in this module is a different answer to "how do we get $f$, and how do we know it's any good?"

## Check yourself
1. Why does the definition say "generalise to unseen data" rather than just "learn from data"? :: Because memorising the training data is not learning. A model that scores perfectly on data it has seen and badly on new data has failed — that is overfitting, the central problem of Week 2.

@@ id=s1-ai-ml-dl | title=AI ⊃ ML ⊃ DL | kind=concept | topic=S1 · Foundations | key | tags=definition,exam
Three nested sets, not three alternatives:

```text
Artificial Intelligence
└── Machine Learning
    └── Deep Learning
```

* **AI** — machines performing tasks that normally need human intelligence.
* **ML** — the subset that learns those tasks *from data*.
* **DL** — the subset of ML using multi-layer neural networks.

Deep learning is Part 2 of this module. Part 1 is everything else.

## Check yourself
1. Is deep learning a fourth learning paradigm alongside supervised/unsupervised/reinforcement? :: No. It is a model family that sits inside ML. A deep network can be trained supervised, unsupervised or by reinforcement.

@@ id=s1-module-shape | title=Module shape and what the exam actually is | kind=cheatsheet | topic=S1 · Foundations | key | tags=logistics,exam
| | Part 1 | Part 2 |
| --- | --- | --- |
| Content | Basic ML concepts + popular general ML methods | Neural networks / deep learning, NLP, image processing |
| Weeks | 1 Intro + preprocessing · 2 Regression, generalisation, evaluation · 3 Classification · 4 Ensemble learning | later |

**Assessment split**

| Component | Weight | Format |
| --- | --- | --- |
| Class test | 50% | Week 7, computer-based, timed: 1.5 hours + 30 min upload |
| Group project | 50% | Design/implement neural networks; group report + individual report |

The class test is a **computer** test. That means running, reading and repairing code under time pressure — not writing essays about it.

@@ id=s1-five-stage-process | title=The five-stage ML process | kind=concept | topic=S1 · The process | key | tags=pipeline,exam,workflow | cards=card-001,card-005
The backbone of the whole module. Memorise the order — exam tasks are usually "something is wrong at stage N".

```text
Understand application / define problem
            ↓
   Data collection
            ↓
   Data preprocessing
            ↓
   Data modelling (machine learning)
            ↓
   Model evaluation ──unsatisfied──┐
            ↓                      │
   Model application               │
            ↓                      │
   New / unseen data               │
            └──────────────────────┘
```

The loop matters: **evaluation feeding back** is what makes this iterative rather than a straight line. If the model is unsatisfactory you go back and change preprocessing or modelling — you do not go back and change the test set.

## Check yourself
1. Which stage does the "unsatisfied" arrow return to? :: Back into preprocessing/modelling — you revise how you prepared the data or which model you used. You never tune against the test set.
2. Give the five stages in order. :: Get data → know the data (EDA) → process the data (preprocessing) → build model(s) → evaluate.

@@ id=s1-lab-five-steps | title=The lab's own wording of the process | kind=cheatsheet | topic=S1 · The process | key | tags=pipeline,lab
Lab 1 states it as five steps. This is the phrasing to reproduce:

| Step | Name | What you actually do |
| --- | --- | --- |
| 1 | Get data | load the file, check `.shape` |
| 2 | Know the data | EDA — `.info()`, `.describe()`, plots |
| 3 | Process the data | pre-processing — missing values, encoding, scaling |
| 4 | Build model(s) | modelling — `fit()` |
| 5 | Evaluate the model | evaluation — `predict()` then a metric |

If an exam task drops you into unfamiliar code, find which of these five you are in before changing anything.

@@ id=s1-why-preprocessing | title=Why preprocessing gets its own week | kind=concept | topic=S1 · The process | tags=preprocessing,exam
The session's own summary makes three claims worth quoting back:

1. Learning a model from data is a **systematic procedure**, not a single step.
2. It is **vital to invest time and effort on data pre-processing**.
3. The choice of algorithm depends on **data characteristics and application domain** — there is no universally best algorithm.

Point 3 is why "which model should I use?" is never answerable without first looking at the data.

@@ id=s1-supervised | title=Supervised learning | kind=concept | topic=S1 · Paradigms | key | tags=paradigm,exam
The outputs/targets are **predetermined** — every training row carries its answer.

Oriented towards **prediction and interpretation**. Two tasks:

| Task | Target type | Example from the slides |
| --- | --- | --- |
| Classification | categorical | is a tumour benign or malignant |
| Regression | continuous | bitcoin price prediction |

The banknote dataset is the worked example: four numeric features (variance, skewness, curtosis, entropy) plus a `class` column of genuine/forged. The presence of that last column is what makes it supervised.

## Check yourself
1. What single feature of a dataset tells you supervised learning is possible? :: A known target value for every training row — a label column.

@@ id=s1-unsupervised | title=Unsupervised learning | kind=concept | topic=S1 · Paradigms | key | tags=paradigm,exam
**Not provided with classification labels.** The basic task is to develop the labels automatically.

Main example in this module: **clustering**, e.g. k-means.

The slides make the point elegantly by showing the *same* banknote table twice — once with the `class` column, once without. Same data, same rows; removing one column changes the problem from supervised to unsupervised.

## Check yourself
1. The banknote table appears twice in the slides. What is the only difference, and why does it matter? :: The second version has no `class` column. Without labels you cannot learn a mapping to them, so the task becomes discovering structure — clustering — instead of prediction.

@@ id=s1-reinforcement | title=Reinforcement learning | kind=concept | topic=S1 · Paradigms | tags=paradigm,exam
Described as **more general** than supervised/unsupervised: learn from **interaction with an external environment** to achieve a goal.

```text
                    action
    agent ──────────────────────► environment
          ◄──────────────────────
            reward, new state
```

The defining examples:

* **Game playing** — the player knows whether it won or lost, but not the correct move at each step.
* **Control** — a traffic system can measure the delay of cars, but not how to decrease it.

That gap — knowing the outcome but not the correct individual action — is the whole reason reinforcement learning is a separate paradigm.

## Check yourself
1. Why is a win/loss signal not the same as a label? :: A label tells you the right answer for that row. A win/loss tells you only whether a whole sequence of decisions ended well, with no information about which individual move was right.

@@ id=s1-paradigm-picker | title=Which paradigm? A 5-second test | kind=cheatsheet | topic=S1 · Paradigms | key | tags=recall,exam
```text
Is there a target column with known values?
│
├── yes → SUPERVISED
│         categorical target → classification
│         continuous target  → regression
│
├── no, just features → UNSUPERVISED (clustering)
│
└── no, but an agent acts and receives rewards → REINFORCEMENT
```

Then the second question, which people forget: **is the target categorical or continuous?** A numeric-looking target can still be categorical — the fruit dataset labels fruit types as 1/2/3, and that is classification, not regression.

@@ id=s1-model-evaluation-role | title=What model evaluation is for | kind=concept | topic=S1 · The process | tags=evaluation
Evaluation measures a learned model's performance in order to give **confidence in its future application to unseen data**.

That phrasing is precise and worth keeping: you are not measuring how well the model did, you are estimating how well it *will* do. Which is exactly why the test set must stay untouched until the end.

Full treatment comes in Week 2.
