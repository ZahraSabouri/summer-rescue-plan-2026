Derived from the CMT307 taxonomy note. These are the confusions the material explicitly warns about, plus the ones its structure sets you up for. Each one is a sentence you could lose marks on.

## Naming traps

| Trap | Why it catches people | The correction |
| --- | --- | --- |
| "Logistic regression is regression" | The word *regression* is in the name | Its target is categorical, so it is a **classification** method. The name is historical. |
| "Decision trees are classifiers" | They are introduced with classification | Trees, k-NN, SVM and neural networks all do **both** tasks. |
| "Deep learning is a fourth paradigm" | It is always listed alongside the other three | It is a **model family inside ML**, orthogonal to supervision. |
| "Ensemble learning is an algorithm" | It appears in the methods list | It is a **strategy for combining** models — bagging, boosting, stacking. |

## Category-level traps

| Trap | The correction |
| --- | --- |
| Using *labelled* and *supervised* interchangeably | Labelled describes the **data**; supervised describes the **learning setting**. Say which one you mean. |
| Treating anomaly detection as always unsupervised | CMT307 lists it under unsupervised, but a detector can also be trained on labelled normal/anomalous examples. |
| Assuming numeric target means regression | Digit labels $0..9$ are numeric but **categorical**. Check what the number *means*. |
| Calling clustering "classification without labels" | Clustering does not assign to predefined classes — the groups have no supplied meaning. Any interpretation happens afterwards. |
| Listing an RL algorithm in an exam answer | The current material names **no specific RL algorithm**. Describe the agent/environment/reward loop instead. |

## Exam-technique traps

* **Do not pad an answer with paradigms the module has not covered.** Semi-supervised, self-supervised, active and transfer learning are not part of the currently supported CMT307 taxonomy. Naming them as course content is a risk, not a bonus.
* **Do not infer class balance.** For the Lab 1 shopper dataset, compute it. An assumed imbalance is an unsupported claim.
* **Name the paradigm *and* the task.** "Supervised" alone is half an answer; "supervised classification, binary" is a full one.
* **Justify from the target, not the algorithm.** Write "the target is categorical, therefore classification" rather than "it uses a decision tree, therefore classification".

## Check yourself

1. A colleague says "we used regression because the model was logistic regression". What is wrong? :: The task is set by the target type, not the model name. Logistic regression predicts a categorical target, so the task is classification.
2. Why is it risky to write "anomaly detection is an unsupervised technique" as an unqualified statement? :: Because anomaly detection can also be done with labelled normal/anomalous data. CMT307 places it under unsupervised, but the technique is not intrinsically label-free.
3. MNIST digits are labelled $0..9$. Is predicting them regression? :: No. The digits are categories that happen to be written as numbers, so it is multi-class classification.
4. Should you mention semi-supervised learning in a CMT307 answer on learning types? :: Not as course content — it does not appear in the provided materials. MAT700 does expect it, so keep the two modules separate in your head.
