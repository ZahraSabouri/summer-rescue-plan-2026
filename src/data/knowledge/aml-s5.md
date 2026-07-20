@@ id=s5-what-is-ensemble | title=What ensemble learning is | kind=concept | topic=S5 · Foundations | key | tags=ensemble,exam
> **A group of models/estimators is called an ensemble**; select a collection of models and combine their predictions.

Example: generate 100 different decision trees from the same or different training sets and have them **vote** on the best classification for a new example.

> **Key motivation: reduce the error rate.** The hope is that it becomes much more unlikely that the ensemble will misclassify an example.

Everything before this session learned a *single* model chosen from a model space. Ensembles change the unit of prediction from one model to many.

```text
          Data 1 → Learner 1 → Model 1  ┐
Training  Data 2 → Learner 2 → Model 2  ├→ Model Combiner → Final model
  data    ...      ...          ...     │
          Data m → Learner m → Model m  ┘
```

Combination is typically by **weighted voting**.

## Check yourself
1. What is the key motivation for ensembles? :: To reduce the error rate — making it less likely that the combination misclassifies an example than any single model.

@@ id=s5-no-free-lunch | title=Why ensembles work: independence and error cancellation | kind=concept | topic=S5 · Foundations | key | tags=ensemble,exam,core
**"No Free Lunch" Theorem — no single algorithm wins all the time.**

The mechanism, in the slides' own words:

> When combining multiple **independent and diverse** decisions, each of which is **at least more accurate than random guessing**, random errors cancel each other out and correct decisions are reinforced.

Human analogies given: estimating jelly beans in a jar (individual guesses versus the group average), and elections.

Note the **two conditions**. Each model must beat random guessing, and the models must be independent. Fail either and combination does not help.

## Check yourself
1. State the two conditions under which combining models helps. :: Each model must be more accurate than random guessing, and their decisions must be independent and diverse so that errors are uncorrelated.
2. What does the No Free Lunch theorem say? :: No single algorithm performs best on all problems.

@@ id=s5-majority-vote-maths | title=The majority-vote calculation | kind=cheatsheet | topic=S5 · Foundations | key | tags=ensemble,exam,formula
The slides' worked example, and a very likely exam calculation.

Five **completely independent** classifiers, each 70% accurate. The majority is correct if 3, 4 or 5 of them are correct:

$$P = \binom{5}{5}0.7^5 + \binom{5}{4}0.7^4(0.3) + \binom{5}{3}0.7^3(0.3)^2$$

$$= 0.7^5 + 5 \times 0.7^4 \times 0.3 + 10 \times 0.7^3 \times 0.3^2 = 83.7\%$$

So **70% individual accuracy → 83.7% majority-vote accuracy**. With **101 such classifiers → 99.9%**.

Binomial distribution: $P(x; n, p) = \dfrac{n!}{x!(n-x)!}p^x(1-p)^{n-x}$

**The caveat is as examinable as the result:**

> This is only true if all classifiers are perfectly independent, making uncorrelated errors, **which is clearly not the case** since they are trained on the same data or the same type of learners.

That gap between theory and reality is precisely what bagging, boosting and random forests each try to close by manufacturing diversity.

## Check yourself
1. Five independent 70%-accurate classifiers vote. What is the ensemble accuracy, and which terms do you sum? :: 83.7%, summing the binomial probabilities of exactly 3, 4 and 5 being correct.
2. Why is the real-world gain smaller than this calculation suggests? :: The classifiers are not independent — trained on the same data with similar learners, their errors are correlated.

@@ id=s5-diversity | title=Making learners different | kind=cheatsheet | topic=S5 · Foundations | key | tags=ensemble,exam
Four ways to get different learners:

1. **Different learning algorithms**
2. **Algorithms with different choices for parameters**
3. **Dataset with different features**
4. **Dataset with different subsets**

> Ensemble methods work best when the models are **as independent from one another as possible** — diversifying models as much as possible. This increases the chance that they will make very different types of errors, improving the ensemble's accuracy.

**Homogeneous ensembles** use a single, arbitrary learning algorithm but **manipulate the training data** to make it learn multiple models:

| Method | How it changes the data |
| --- | --- |
| **Bagging** | **Resample** training data |
| **Boosting** | **Reweight** training data |

In software such as WEKA these are called **meta-learners**: they take a learning algorithm as an argument (the **base learner**) and create a new learning algorithm.

## Check yourself
1. Bagging and boosting both manipulate training data. What is the one-word difference? :: Bagging resamples; boosting reweights.
2. What is a meta-learner? :: An algorithm that takes a base learning algorithm as input and produces a new, composite learning algorithm.

@@ id=s5-hypothesis-space | title=Ensembles enlarge the hypothesis space | kind=concept | topic=S5 · Foundations | tags=ensemble,theory
Another way of thinking about ensemble learning: **a way of enlarging the hypothesis space.** The ensemble is itself a hypothesis, and the new hypothesis space is the set of **all possible ensembles constructible from hypotheses of the original space**.

The slides' illustration: three linear threshold hypotheses, with the ensemble classifying an example as positive only if all three do. The resulting **triangular** region **is not expressible in the original hypothesis space** — no single linear threshold can draw a triangle.

This is the deepest justification for ensembles: they do not merely average away noise, they can represent decision boundaries that no member could.

## Check yourself
1. How can an ensemble of linear classifiers produce a non-linear boundary? :: By combining several linear thresholds — for example requiring all three to agree — the accepted region becomes a polygon, which no single linear model can express.

@@ id=s5-bagging | title=Bagging = bootstrap aggregating | kind=concept | topic=S5 · Bagging | key | tags=bagging,exam,core
**Bootstrap:** draw $n$ items from the training dataset $D$ **with replacement**.

**Bagging** (Breiman, 1996):

1. Take $M$ bootstrap samples.
2. Train $M$ learners, one per sample.
3. Combine outputs by **voting** (majority vote) or **averaging**.

```text
Given a standard training set D of size n
For i = 1 .. M
    draw a sample of size n* ≤ n from D uniformly and with replacement
    learn classifier Ci
Final classifier is a vote of C1 .. CM
```

**What it achieves:**

> Decreases error by **decreasing the variance** in the results, due to unstable learners — algorithms (like decision trees and neural networks) whose output can change dramatically when the training data is slightly changed.

Also: **bagging can be made parallel, so it scales well** — every model is independent of the others.

**Bagging vs pasting**, a one-line distinction worth knowing:

| | Sampling |
| --- | --- |
| **Bagging** | **with** replacement — training instances may be sampled several times |
| **Pasting** | **without** replacement |

## Check yourself
1. What does bagging stand for and what does the bootstrap do? :: Bootstrap aggregating. The bootstrap draws samples of size n from the training set uniformly with replacement.
2. Which error component does bagging reduce? :: Variance.
3. What distinguishes pasting from bagging? :: Pasting samples without replacement.
4. Why does bagging parallelise well? :: Each model is trained independently on its own sample, so there is no sequential dependency.

@@ id=s5-boosting | title=Boosting | kind=concept | topic=S5 · Boosting | key | tags=boosting,exam,core
> **Boosting refers to any ensemble method that can combine several weak learners into a strong learner.**
>
> **Train predictors sequentially, each trying to correct its predecessor.**

**Strong vs weak learner:**

| | Takes | Produces |
| --- | --- | --- |
| **Strong learner** — the objective of ML | labelled training data | a classifier that can be **arbitrarily accurate** |
| **Weak learner** | labelled training data | a classifier **more accurate than random guessing** — i.e. **< 50% error over any distribution** |

> Strong learners are very difficult to construct; constructing weak learners is relatively easy.
>
> Question: can a set of weak learners create a single strong learner? **YES.**

**Key insights** of boosting:

* **Instead of sampling (as in bagging), re-weight examples.**
* Examples are given weights. At each iteration a new weak hypothesis is learned and the examples are **reweighted to focus the system on examples the most recently learned classifier got wrong**.
* Final classification is by **weighted vote** of the weak classifiers.

Originally a theoretical guarantee (Schapire, 1990), revised into the practical **AdaBoost** (Freund & Schapire, 1996).

Packages: `sklearn.ensemble.AdaBoost...`, `GradientBoosting...`, **XGBoost**, **LightGBM**, **CatBoost** — most based on decision trees.

## Check yourself
1. Define a weak learner precisely. :: A learner producing a classifier more accurate than random guessing — less than 50% error over any distribution.
2. What is boosting's key difference from bagging? :: Boosting reweights examples and trains sequentially; bagging resamples and trains independently in parallel.
3. Which examples get more weight at each boosting iteration? :: The ones the most recent weak learner misclassified.

@@ id=s5-adaboost-algorithm | title=AdaBoost, step by step | kind=cheatsheet | topic=S5 · Boosting | key | tags=boosting,exam,algorithm
The high-level description from the slides:

```text
C = 0            /* counter */
M = m            /* number of hypotheses to generate */

1  Set the same weight for all examples (typically 1/N, N = size of data)

2  While (C < M)
     2.1  increase counter C by 1
     2.2  generate hypothesis h_C
     2.3  increase the weight of the examples misclassified by h_C

3  Weighted majority combination of all M hypotheses,
   weights according to how well each performed on the training set
```

Constructing the weak classifiers uses **different data distributions**: start with uniform weighting; during each step **increase weights of examples not correctly learned** and **decrease weights of those correctly learned**. The idea is to **focus on difficult examples**.

Combining uses **weighted voting**: **a better weak classifier gets a larger weight.**

**Performance guarantee:** if the input learner is a weak learner, **AdaBoost will return a hypothesis that classifies the training data perfectly for a large enough $M$**. The strong classifier is a **thresholded linear combination of weak learner outputs**.

In the slide diagram, each rectangle is an example with height proportional to its weight, crosses are misclassified examples, and **the size of each decision tree indicates the weight of that hypothesis in the final ensemble**.

## Check yourself
1. What are the initial example weights in AdaBoost? :: Uniform — typically 1/N.
2. Two different weightings appear in AdaBoost. What are they? :: Example weights, raised for misclassified points each round; and hypothesis weights, set by how well each weak learner performed, used in the final vote.
3. What happens to training accuracy as M grows? :: For a genuine weak learner, AdaBoost eventually classifies the training data perfectly.

@@ id=s5-gradient-boosting | title=Gradient boosting: fitting the residuals | kind=concept | topic=S5 · Boosting | key | tags=boosting,exam
Like AdaBoost, gradient boosting works by **sequentially adding estimators to an ensemble, each one correcting its predecessor**.

**The difference:** unlike AdaBoost, which tweaks the *instance weights* at every iteration, GB tries to **fit the new predictor to the residual errors made by the previous predictor.**

Gradient Boosted Regression Trees (GBRT):

```text
t1 trained on (x, y)       →  r1 = y  - t1(x)
t2 trained on (x, r1)      →  r2 = r1 - t2(x)
t3 trained on (x, r2)      →  r3 = r2 - t3(x)
...
tm trained on (x, r_{m-1}) →  rm = r_{m-1} - tm(x)

Final prediction:  ŷ = Σ t_i(x)
```

Each tree learns what the previous ones got wrong, and the prediction is the **sum** of all trees, not a vote.

## Check yourself
1. What does each successive tree in gradient boosting learn? :: The residual errors left by the ensemble so far.
2. State the one-line difference between AdaBoost and gradient boosting. :: AdaBoost reweights the instances; gradient boosting fits the next model to the residuals.
3. How is the final prediction formed in GBRT? :: By summing the predictions of all the trees.

@@ id=s5-stacking | title=Stacking | kind=concept | topic=S5 · Stacking | key | tags=stacking,exam
**Training:**

1. Train different models on the same data — the **level-0 models**.
2. Train a new **level-1 model** with **the outputs of the level-0 models** as its inputs.

**Prediction:**

1. Given a new unlabelled sample, input it to each level-0 model.
2. The ensemble prediction is the **level-1 model's prediction based on the level-0 predictions**.

```text
        ┌→ Model 1 ┐
data ───┼→ Model 2 ├──→ Level-1 Model ──→ prediction
        └→ Model n ┘
         (level-0)
```

Level-0 models **use different parameters and/or different ML techniques** — the diversity requirement again.

**What makes stacking distinctive:** bagging and boosting combine predictions with a *fixed* rule (vote, weighted vote, sum). Stacking **learns the combination rule** from data. The combiner can discover that one model is reliable in some region and another elsewhere.

## Check yourself
1. What are the inputs to the level-1 model? :: The predictions produced by the level-0 models.
2. How does stacking differ from bagging and boosting in how it combines? :: It learns the combination rule with a second-level model instead of applying a fixed voting or summing rule.

@@ id=s5-random-forest | title=Random forest | kind=concept | topic=S5 · Random forests | key | tags=randomforest,exam,core | cards=card-026
* **Motivation: reduce error correlation between classifiers.**
* **Main idea: build a large number of un-pruned decision trees.**
* **Key: using a random selection of features to split on at each node.**

The algorithm:

* Each tree is grown on a **bootstrap sample** of the training set of $N$ cases.
* A number $m$ is specified **much smaller than the total number of features $M$** — e.g. $m = \sqrt{M}$.
* **At each node, $m$ variables are selected at random out of the $M$**; the split used is the best split on **these $m$ variables**.
* Average the predictions of the trees for a new query, or take a majority vote.

> An ensemble consisting of a **bagging of un-pruned decision tree learners with a randomized selection of features at each split**.

**That is the exam definition: bagging + random feature subset at each split.** Bagging alone gives trees trained on different rows; the random feature selection makes them differ in *structure* too, which is what breaks the error correlation.

**Advantages:**

* error rates compare favourably to AdaBoost;
* **more robust with respect to noise**;
* **more efficient on large data**;
* **provides an estimation of the importance of features** in determining classification.

## Check yourself
1. Give the two sources of randomness in a random forest. :: A bootstrap sample of rows per tree, and a random subset of m features considered at each node split.
2. What is the typical value of m relative to M? :: About $\sqrt{M}$ — much smaller than the total.
3. Why is random forest better than plain bagged trees? :: The random feature subsets decorrelate the trees, so their errors are more independent and the ensemble averages more effectively.
4. Are the trees pruned? :: No — they are grown un-pruned; the ensemble controls variance instead.

@@ id=s5-voting-code | title=Voting classifiers: hard vs soft | kind=cheatsheet | topic=S5 · Code recipes | key | tags=code,sklearn,ensemble,exam
```python
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.svm import SVC

log_clf = LogisticRegression(solver="lbfgs", random_state=42)
rnd_clf = RandomForestClassifier(n_estimators=100, random_state=42)
svm_clf = SVC(gamma="scale", random_state=42)

voting_clf = VotingClassifier(
    estimators=[('lr', log_clf), ('rf', rnd_clf), ('svc', svm_clf)],
    voting='hard')
voting_clf.fit(X_train, y_train)
```

Compare every member against the ensemble — Lab 5's own loop:

```python
for clf in (log_clf, rnd_clf, svm_clf, voting_clf):
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    print(clf.__class__.__name__, accuracy_score(y_test, y_pred))
```

| Voting | Combines | Requirement |
| --- | --- | --- |
| `'hard'` | majority vote over predicted **labels** | none |
| `'soft'` | average of predicted **probabilities** | every estimator must expose `predict_proba` |

**Soft voting usually performs better** — it weights confident predictions more than borderline ones. But it needs `SVC(probability=True)`, which Lab 5 adds for exactly this reason, and which makes SVC noticeably slower to fit.

## Check yourself
1. What is the difference between hard and soft voting? :: Hard votes on predicted labels; soft averages predicted class probabilities.
2. What must change to use soft voting with an SVC, and at what cost? :: Set `probability=True`; it enables probability estimates via internal cross-validation, which slows fitting.

@@ id=s5-bagging-code | title=BaggingClassifier | kind=cheatsheet | topic=S5 · Code recipes | key | tags=code,sklearn,bagging
```python
from sklearn.ensemble import BaggingClassifier
from sklearn.tree import DecisionTreeClassifier

bag_clf = BaggingClassifier(
    DecisionTreeClassifier(random_state=42),
    n_estimators=500,
    max_samples=100,
    bootstrap=True,        # True = bagging; False = pasting
    random_state=42)
bag_clf.fit(X_train, y_train)
y_pred = bag_clf.predict(X_test)
```

| Argument | Meaning |
| --- | --- |
| first positional | the **base estimator** to replicate |
| `n_estimators` | how many models |
| `max_samples` | size of each bootstrap sample |
| `bootstrap` | `True` → **bagging**; `False` → **pasting** |
| `oob_score` | evaluate on out-of-bag examples |

Lab 5 compares a single tree with the 500-tree bag on the same data, and plots both decision boundaries. **The single tree's boundary is jagged and overfits; the bagged boundary is smooth.** That picture is the visual definition of variance reduction.

## Check yourself
1. Which argument switches between bagging and pasting? :: `bootstrap` — `True` for bagging with replacement, `False` for pasting.
2. What visibly changes between a single tree's decision boundary and a bagged ensemble's? :: The single tree's is jagged and follows noise; the ensemble's is smooth and generalises better.

@@ id=s5-oob | title=Out-of-bag evaluation | kind=concept | topic=S5 · Code recipes | key | tags=bagging,evaluation,exam | cards=card-026
Because bootstrap sampling draws **with replacement**, each tree misses some training instances. Those unused instances are **out-of-bag** for that tree, and can serve as a free validation set — no separate holdout needed.

```python
bag_clf = BaggingClassifier(
    DecisionTreeClassifier(random_state=42),
    n_estimators=500, bootstrap=True,
    oob_score=True, random_state=40)
bag_clf.fit(X_train, y_train)

bag_clf.oob_score_                      # estimate from out-of-bag samples
accuracy_score(y_test, bag_clf.predict(X_test))   # true test score — should be close
```

Roughly **37% of instances are out-of-bag** for any given tree, since $(1 - 1/n)^n \to e^{-1} \approx 0.368$.

In Lab 5 the OOB score and the test score come out close, which is the point: **OOB gives you a validation estimate for free**, using data the ensemble structurally had to leave out anyway.

## Check yourself
1. What are out-of-bag instances? :: Training instances not drawn into a particular tree's bootstrap sample, so unseen by that tree.
2. Roughly what fraction of instances is out-of-bag per tree, and why? :: About 37%, because the probability of never being drawn in n draws with replacement tends to $e^{-1}$.
3. What is the practical benefit? :: A validation estimate without holding out extra data.

@@ id=s5-rf-code | title=RandomForestClassifier and feature importance | kind=cheatsheet | topic=S5 · Code recipes | key | tags=code,sklearn,randomforest,exam
```python
from sklearn.ensemble import RandomForestClassifier

rnd_clf = RandomForestClassifier(n_estimators=500, max_leaf_nodes=16, random_state=42)
rnd_clf.fit(X_train, y_train)
y_pred_rf = rnd_clf.predict(X_test)
```

Lab 5 shows this is **near-identical** to a hand-built equivalent:

```python
bag_clf = BaggingClassifier(
    DecisionTreeClassifier(splitter="random", max_leaf_nodes=16, random_state=42),
    n_estimators=500, max_samples=1.0, bootstrap=True, random_state=42)
```

with the two agreeing on almost every prediction. `RandomForestClassifier` is a tuned, convenient special case of bagged randomised trees.

**Feature importance** — one of the headline advantages:

```python
from sklearn.datasets import load_iris
iris = load_iris()
rnd_clf = RandomForestClassifier(n_estimators=500, random_state=42)
rnd_clf.fit(iris["data"], iris["target"])

for name, score in zip(iris["feature_names"], rnd_clf.feature_importances_):
    print(name, score)
```

Importances sum to 1 and measure how much each feature reduced impurity across the forest. Useful for **feature selection** — which links straight back to Session 2's embedded methods.

## Check yourself
1. How does `RandomForestClassifier` relate to `BaggingClassifier` with randomised trees? :: It is essentially a convenient, optimised special case of it — Lab 5 shows the two produce nearly identical predictions.
2. What do `feature_importances_` sum to and what do they measure? :: They sum to 1 and measure each feature's total impurity reduction across all trees.

@@ id=s5-adaboost-code | title=AdaBoost and gradient boosting in sklearn | kind=cheatsheet | topic=S5 · Code recipes | key | tags=code,sklearn,boosting
```python
from sklearn.ensemble import AdaBoostClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier

ada_clf = AdaBoostClassifier(
    DecisionTreeClassifier(max_depth=1),   # a "stump" — the classic weak learner
    n_estimators=200,
    learning_rate=0.5,
    random_state=42)
ada_clf.fit(X_train, y_train)

gbrt = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1,
                                  max_depth=3, random_state=42)
```

**`max_depth=1` is deliberate.** A depth-1 tree — a decision stump — is barely better than random guessing, which is exactly the definition of a weak learner. Boosting *wants* weak members; giving AdaBoost deep trees defeats the mechanism and overfits.

`learning_rate` shrinks each learner's contribution. Lower rate needs more estimators — the two trade off against each other.

## Check yourself
1. Why does AdaBoost use `max_depth=1` trees? :: A decision stump is a weak learner — only slightly better than random — which is what boosting is designed to combine.
2. How do `learning_rate` and `n_estimators` interact? :: They trade off: a smaller learning rate needs more estimators to reach the same fit.

@@ id=s5-method-picker | title=Which machine learning method? | kind=cheatsheet | topic=S5 · Choosing | key | tags=exam,recall,core
> **There is no universal best ML method for all situations. The identification of the most appropriate ML for a specific application is often more an art than a science.**

**Know your data and requirements:** linear or nonlinear; interpretable or black box.

**By feature type:**

| Feature type | Implication |
| --- | --- |
| **Categorical** | **decision tree-based methods straightforward**; otherwise convert to numeric with an encoding method such as one-hot |
| **Numerical** | **required by most ML methods** — SVM, neural networks, kNN. **Pre-processing including feature scaling is required by many.** |

**By dataset size:**

* A model with a large number of parameters needs a large dataset to train.
* **Small and medium size** → general ML models such as kNN, SVM.
* **Very large size** → deep learning with mini-batch.

**By computing requirements:** some models take a long time to train — large deep networks, and **SVM with larger C takes longer to train**.

**Trial and error:** often you must try several methods. **Diversify the selection** — experiment with a representative method from each group: one linear, one simple, one tree-based, one neural network.

## Check yourself
1. Which model family handles categorical features without encoding? :: Tree-based methods.
2. What does the module recommend when you do not know which method suits? :: Trial and error with a deliberately diverse selection — one from each family: linear, simple, tree-based, neural network.
3. Which hyperparameter makes SVM training slower as it grows? :: C.

@@ id=s5-ensemble-comparison | title=Bagging vs boosting vs stacking, side by side | kind=cheatsheet | topic=S5 · Choosing | key | tags=exam,recall | cards=card-024
| | **Bagging** | **Boosting** | **Stacking** |
| --- | --- | --- | --- |
| Data manipulation | **resample** (bootstrap) | **reweight** | same data, different models |
| Training order | **parallel**, independent | **sequential**, each corrects the last | level-0 parallel, then level-1 |
| Base learners | same algorithm, usually **strong/unpruned** | same algorithm, usually **weak** (stumps) | **different** algorithms |
| Combination | majority vote / average | **weighted** vote, or sum of residual fits | a **learned** level-1 model |
| Mainly reduces | **variance** | **bias** | both, by learning where each model is right |
| Parallelisable | **yes** | no — inherently sequential | partly |
| Example | Random Forest | AdaBoost, GBRT, XGBoost | — |

**The one-line answers, worth memorising:**

* Bagging trains many models **independently on resampled data** and votes — reducing **variance**.
* Boosting trains models **sequentially on reweighted data**, each fixing its predecessor — reducing **bias**.
* Stacking trains a **model to combine** other models' predictions.

## Check yourself
1. Which reduces variance and which reduces bias? :: Bagging reduces variance; boosting reduces bias.
2. Which cannot be parallelised, and why? :: Boosting — each learner depends on the errors of the previous one, so training is inherently sequential.
3. Which uses weak base learners by design? :: Boosting.

@@ id=s5-trap-boosting-strong-learners | title=Trap: giving boosting strong learners | kind=traps | topic=S5 · Debugging | key | tags=boosting,debugging,exam
```python
# ✗ deep trees defeat the mechanism and overfit fast
AdaBoostClassifier(DecisionTreeClassifier(max_depth=20), n_estimators=200)

# ✓ stumps — genuinely weak learners
AdaBoostClassifier(DecisionTreeClassifier(max_depth=1), n_estimators=200)
```

Boosting is designed to turn **weak** learners into a strong one by concentrating on hard examples. Hand it learners that already fit the training data almost perfectly and there are no informative errors left to reweight — you get a slow, overfitted ensemble.

**Bagging is the opposite:** it wants strong, unstable, unpruned learners, because it works by averaging away their variance. Random forests grow **un-pruned** trees deliberately.

## Check yourself
1. Boosting wants weak learners and bagging wants strong ones. Why the opposite requirement? :: Boosting reduces bias by combining many crude models that each correct the last, so its members must be simple. Bagging reduces variance by averaging over unstable high-capacity models, so its members should be strong.

@@ id=s5-trap-ensemble-correlation | title=Trap: an ensemble that does not beat its members | kind=traps | topic=S5 · Debugging | key | tags=ensemble,debugging,exam
If a `VotingClassifier` scores no better than its best member, the members are **too correlated** — they make the same mistakes, so there is nothing to cancel out.

Diagnose by measuring agreement, exactly as Lab 5 does:

```python
import numpy as np
np.sum(y_pred_a == y_pred_b) / len(y_pred_a)   # near 1.0 → no diversity
```

Fixes, in the order the module presents them:

1. **different algorithms** rather than three variants of one;
2. **different hyperparameters**;
3. **different feature subsets**;
4. **different data subsets** (bagging);
5. switch `voting='hard'` to `'soft'` to use confidence, not just labels.

Remember the majority-vote arithmetic depends on independence. **Five identical classifiers give exactly the accuracy of one.**

## Check yourself
1. Your voting ensemble matches its best member. What is the likely cause? :: The members' errors are highly correlated, so voting cannot cancel anything.
2. How do you measure it? :: Compare the members' predictions pairwise; a near-1.0 agreement rate means no diversity.

@@ id=s5-trap-rf-no-scaling | title=Trap: over-preprocessing for tree ensembles | kind=traps | topic=S5 · Debugging | tags=randomforest,debugging
Random forests and gradient-boosted trees inherit the decision tree's properties: **no feature scaling or centering needed at all**, and they cope with categorical features far more directly than distance-based methods.

Scaling them is harmless but wasted effort, and in a timed test it is time you do not have. What tree ensembles *do* still need:

* **encoding** of string categoricals — sklearn's implementations require numeric input even though the algorithm does not care about scale;
* **imputation** — sklearn trees do not accept `NaN` (except `HistGradientBoosting*`, which does).

**The reverse mistake is more costly:** dropping the scaler when you switch from a forest back to SVM or k-NN. If a pipeline swaps models, check its preprocessing still matches.

## Check yourself
1. Do random forests need feature scaling? :: No — like single trees, they split one feature at a time.
2. What preprocessing do they still require in sklearn? :: Encoding of string categoricals into numbers, and imputation of missing values for most implementations.
