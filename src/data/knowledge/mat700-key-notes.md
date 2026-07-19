Distilled from the MAT700 taxonomy note. The examinable insight is that MAT700 classifies learning systems along **four independent axes**, not one. Most lost marks come from collapsing them into a single list.

## The four axes

| Axis | The question it answers | Values |
| --- | --- | --- |
| **Supervision** | What labels do I have? | supervised · unsupervised · semi-supervised |
| **Generalisation** | What is stored after training? | instance-based · model-based |
| **Data arrival** | When does the data show up? | all-data-first (offline) · online |
| **Level** | Does it learn, or combine learners? | ordinary/base learner · meta-algorithm |

These combine freely. That is the whole point:

* supervised **and** instance-based → kNN
* supervised **and** model-based → Naive Bayes, SVM
* unsupervised **and** model-based → k-means (stores centres)
* supervised, online **and** meta → Halving, weighted majority

> Never write "instance-based learning is a type of supervised learning." Write "instance-based versus model-based describes how generalisation is achieved; supervised versus unsupervised describes whether targets are supplied."

## Where every MAT700 algorithm sits

| Method | Supervision | Task | Instance/model | Offline/online | Level |
| --- | --- | --- | --- | --- | --- |
| kNN / weighted kNN | supervised | classification | instance | offline | ordinary |
| Naive Bayes | supervised | classification | model (probabilistic) | offline | ordinary |
| SVM | supervised | classification | model | offline | ordinary |
| k-means | unsupervised | hard clustering | model (centres) | offline | ordinary |
| Hierarchical clustering | unsupervised | clustering | distance-based | offline | ordinary |
| AdaBoost | supervised | classification | combines models | offline | **meta** |
| Halving | supervised feedback | online prediction | expert-based | **online** | **meta** |
| Weighted majority | supervised feedback | online prediction | expert-based | **online** | **meta** |

## Things that are not learning types at all

PageRank (graph ranking), minhashing (approximate Jaccard similarity), shingling (document representation), TF-IDF (text weighting), Jaccard/Euclidean/Manhattan/edit distance (similarity measures), precision/recall/F-measure (evaluation), softmax (score-to-probability), cross-entropy (loss).

If an exam question asks for learning *types* and you list these, you are answering a different question.

## Unsupervised is wider here than in CMT307

MAT700 unsupervised covers **five** tasks, not two:

1. clustering
2. association-rule discovery — $A \Rightarrow B$, e.g. {cheese, milk} ⇒ {bread}
3. density estimation — estimate $P(Z)$ itself
4. representation learning — learn $g: X \rightarrow W$ so the problem gets easier
5. outlier/anomaly analysis

## Clustering sub-distinctions

| Distinction | Options | k-means is |
| --- | --- | --- |
| membership | hard vs soft | **hard** (soft = Gaussian mixture) |
| construction | hierarchical/agglomerative vs point-assignment | **point-assignment** |
| space | Euclidean vs non-Euclidean | **Euclidean** |
| representative | centroid (mean) vs medoid (actual point) | **centroid** |

## Semi-supervised: the minimal safe answer

> Semi-supervised learning uses a mixture of labelled and unlabelled training data — typically a small labelled set $D_L$ and a much larger unlabelled set $D_U$.

The 2023 paper asks for all three settings; the 2024 paper asks for two. Learn the one-sentence definition and stop there — the lecture material does not develop it further.

## Check yourself

1. Name the four independent axes MAT700 uses to classify learning systems. :: Supervision (supervised/unsupervised/semi-supervised), generalisation (instance- vs model-based), data arrival (offline vs online), and level (ordinary vs meta-algorithm).
2. Classify kNN on all four axes. :: Supervised, classification, instance-based, normally offline, ordinary (not meta).
3. Why is AdaBoost not an alternative to supervised learning? :: It *is* supervised. Meta-algorithm describes the level at which it operates — it combines weak learners — not the supervision setting.
4. Give the five unsupervised tasks in MAT700. :: Clustering, association-rule discovery, density estimation, representation learning, and outlier/anomaly analysis.
5. Is k-means hard or soft clustering, and what is the soft counterpart? :: Hard — each point belongs to exactly one cluster. The soft counterpart is a Gaussian mixture model, where points get degrees of membership.
6. What is minhashing, and what is it not? :: A probabilistic method for approximating Jaccard similarity. It is not a learning algorithm and does not belong in an answer about learning types.
7. Define online learning as a round. :: An input is revealed, the learner predicts, the true label is revealed, the learner incurs a loss, and the model updates.
