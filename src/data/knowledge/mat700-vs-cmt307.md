You are revising two modules that teach overlapping taxonomies with **different scopes**. Answering a MAT700 question with the CMT307 taxonomy (or the reverse) is the single most likely way to lose easy marks. This note exists to keep them separate.

## Side-by-side

| | CMT307 (Applied ML) | MAT700 (Maths for Data Mining) |
| --- | --- | --- |
| **Supervision settings** | supervised, unsupervised, **reinforcement** | supervised, unsupervised, **semi-supervised** |
| **Reinforcement learning** | included as a third paradigm | not a taught paradigm |
| **Semi-supervised** | explicitly *not* in the materials | **examinable** (2023 paper asks for it) |
| **Unsupervised tasks** | clustering, anomaly detection | clustering, association rules, density estimation, representation learning, outliers |
| **Extra axes** | none — one taxonomy | instance/model, offline/online, ordinary/meta |
| **Clustering methods** | k-means | k-means **and** hierarchical clustering |
| **Named classifiers** | logistic reg., SVM, k-NN, trees, NN, ensembles | kNN, weighted kNN, Naive Bayes, SVM, AdaBoost |
| **Regression detail** | heavy — linear, polynomial, ridge, LASSO, elastic net | light — squared error $L(f,(x,y)) = \|f(x) - y\|^2$ |
| **Non-learning topics** | preprocessing, train/test split | PageRank, minhashing, shingling, TF-IDF |

## The three highest-risk swaps

1. **Reinforcement learning in a MAT700 answer.** MAT700's third setting is semi-supervised. Writing "supervised, unsupervised and reinforcement" for MAT700 answers the wrong question.
2. **Semi-supervised in a CMT307 answer.** The CMT307 materials explicitly do not cover it. Presenting it as course content is unsupported.
3. **The four axes in a CMT307 answer.** Instance- vs model-based and offline vs online are MAT700 framing. CMT307 has one taxonomy, not four.

## What is safely shared

Both modules agree on all of this, so it is safe in either exam:

* labelled/unlabelled describes the **data**; supervised/unsupervised describes the **setting**
* supervised splits into classification (categorical target) and regression (continuous target)
* clustering groups unlabelled data; k-means is the worked example
* an algorithm name does not fix the task — the target type does
* a numeric-looking label can still be categorical

## Check yourself

1. MAT700 asks you to define three learning settings. Which three? :: Supervised, unsupervised, semi-supervised. Not reinforcement — that is CMT307's third.
2. CMT307 asks for the learning paradigms. Should semi-supervised appear? :: No. It is not in the provided CMT307 materials. Use supervised, unsupervised, reinforcement.
3. Which module expects you to know that k-means is "hard, point-assignment, Euclidean, centroid-based"? :: MAT700. CMT307 only uses k-means as a clustering example.
4. Which module treats regularised regression (ridge, LASSO, elastic net) in detail? :: CMT307. MAT700 gives regression only a squared-error loss framing.
5. Name three MAT700 topics that are not learning algorithms at all. :: Any of PageRank, minhashing, shingling, TF-IDF, Jaccard similarity, softmax, cross-entropy.
