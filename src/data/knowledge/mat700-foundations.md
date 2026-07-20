@@ id=m7-exam-shape | title=The exam, and what actually repeats | kind=cheatsheet | topic=MAT700 · Exam shape | key | tags=exam,logistics,strategy
| | |
| --- | --- |
| Format | **Written paper, 2 hours** |
| Structure | 4 questions, **answer THREE**; each on a separate page |
| Marks | **75 total**; marks shown against each part |
| Allowed | calculator, squared graph paper, **your own notes: 1 sheet, 2 sides of A4** |

**The single most useful fact about this module: the 2023 and 2024 papers ask almost the same things.**

| Topic | 2023 | 2024 |
| --- | :---: | :---: |
| Supervised / unsupervised (/ semi-supervised) definitions | ✓ | ✓ |
| Bonferroni's principle + birthday-triples expectation | ✓ | ✓ |
| TF–IDF definition, bound proof, numeric calculation | ✓ | ✓ |
| Prove edit distance is a distance measure | ✓ | ✓ |
| Precision, recall, F-measure + prove $F \leq (p+r)/2$ | ✓ | ✓ |
| PageRank — describe and compute | ✓ | ✓ |
| Meta-algorithm; halving and weighted majority | ✓ | ✓ |
| Prove halving makes at most $\log_2 n$ mistakes | ✓ | ✓ |
| kNN and weighted kNN, worked numerically | ✓ | ✓ |
| Naive Bayes classification, worked numerically | ✓ | ✓ |
| k-means: formulate + objective function | ✓ | ✓ |

Only a handful of items appear in one year and not the other: Jaccard sets/bags and graph adjacency (2024); SVM margin, graph Laplacian, multiclass reduction (2023).

**Strategy that follows from this.** You answer 3 of 4. The recurring core above spans every question, so there is no safe way to skip a lecture — but there is a very high-value core to over-prepare. Learn the proofs verbatim; they are worth 3–5 marks each and are identical year on year.

## Check yourself
1. How many questions do you answer, out of how many? :: Three out of four.
2. What notes are you allowed to bring? :: One sheet of A4, both sides, in your own hand.
3. Name four things that appeared in both the 2023 and 2024 papers. :: Any of: supervised/unsupervised definitions, Bonferroni + birthday triples, TF–IDF, edit-distance proof, precision/recall/F + its bound, PageRank, halving/weighted majority, kNN, Naive Bayes, k-means.

@@ id=m7-cheat-sheet-plan | title=What to put on the A4 sheet | kind=cheatsheet | topic=MAT700 · Exam shape | key | tags=exam,strategy,recall | cards=mat700-final-recall
You get **two sides of A4**. It is not a place for prose — it is a place for the things that are expensive to reconstruct under time pressure.

**Side 1 — formulas you must not derive in the room**

* TF–IDF: $TF_{ij} = \dfrac{f_{ij}}{\max_k f_{kj}}$, $IDF_i = \log_2 \dfrac{N}{n_i}$
* Softmax and cross-entropy
* Distance axioms (all four), $L_r$ norm
* Jaccard for sets and for bags
* Precision, recall, F-measure
* PageRank iteration $v' = (1-\beta)e/n + \beta M v$
* k-means objective $E = \sum_{i=1}^{k}\sum_{p \in C_i} dist(p, c_i)^2$
* Naive Bayes with the pseudo-count correction
* Weighted majority bound; halving bound
* Birthday-triples expectation $\binom{K}{3}\dfrac{1}{N^2}$

**Side 2 — proof skeletons**, one or two lines each, enough to reconstruct:

* edit distance is a metric (4 axioms, triangle via concatenating edit scripts)
* Jaccard distance is a metric
* $F \leq (p+r)/2$ reduces to $(p-r)^2 \geq 0$
* halving: $|C_{t+1}| \leq |C_t|/2$ and $1 \leq |C_{T+1}|$
* $\sum_v \deg(v) = 2|E|$ — each edge counted twice
* minhash collision probability $= |X|/(|X|+|Y|)$
* k-means: both steps decrease $E$, finitely many partitions

**Do not** waste the sheet on definitions you can write from memory, or on worked examples — you will not have time to read them.

@@ id=m7-what-is-data-mining | title=Data mining, and how it differs from statistics | kind=concept | topic=MAT700 · L1 Foundations | key | tags=definition,exam | cards=mat700-rebuild-l1
> **Data mining is the process of extracting patterns from large data sets by combining methods from statistics and artificial intelligence with database management.**
>
> **Results of data mining are models or patterns.**

Some regard data mining as synonymous with machine learning. **Machine Learning = learn models from data** — the ability to teach a computer without explicitly programming it.

**Data mining vs statistics** — an examinable contrast:

| | Statistics | Data mining |
| --- | --- | --- |
| Data origin | collected **to answer specific questions** | usually collected **for some other purpose** (e.g. retail purchase records) |
| Connection to acquisition | designed together | **the mining process may not be connected to the data acquisition process** |
| "Large" means | a few hundred to a thousand points | **millions or billions** of points |
| Extra problems | — | disk-access efficiency and other scale constraints |

**When is ML the right approach?** The lecture is precise:

> The typical case where machine learning is a good approach is when we have **little idea of what we are looking for** in the data. Machine learning has **not** proved successful in situations where we can describe the goals of the mining more directly.

The example given: WhizBang Labs' attempt to use ML to find résumés on the web could not beat hand-designed algorithms looking for obvious résumé words and phrases.

## Check yourself
1. Give one sentence defining data mining. :: The process of extracting patterns from large datasets by combining statistics and AI with database management; the results are models or patterns.
2. State the key difference in how statisticians and data miners obtain their data. :: Statisticians collect data to answer a specific question; data miners usually reuse data collected for some other purpose, often disconnected from the acquisition process.
3. When does the lecture say machine learning is *not* the right tool? :: When the goals of the mining can be described directly — hand-designed rules then tend to win.

@@ id=m7-five-applications | title=The five main types of application | kind=cheatsheet | topic=MAT700 · L1 Foundations | tags=exam,vocabulary
Lecture 1's list of what this module covers:

**Classification, numerical prediction, clustering, ranking** — plus association and pattern analysis.

Stated more fully at the start of the module, the problems considered are: **classification, cluster and outlier analysis, mining time-series and sequence data, text mining and web mining, ranking, pattern analysis.**

The mathematical toolkit spans **Bayesian inference, optimisation theory, collaborative filtering, cluster and pattern analysis, kernel methods and learning theory** — and the preliminaries assumed are **linear algebra, calculus, probability theory and graph theory**.

Famous applications named: Google, Amazon, Netflix, email spam, credit-card fraud detection, automatic abstracting.

@@ id=m7-curse-dimensionality | title=Curse of dimensionality and fake correlations | kind=concept | topic=MAT700 · L1 Foundations | key | tags=exam,statistics
**Curse of dimensionality: the exponential rate of growth in the number of unit cells in the data space as the number of variables increases.**

Two consequences the lecture draws out:

1. **Search becomes prohibitive.** Many statistical methods need exhaustive search; looking at all subsets of $p$ variables requires searching $2^p - 1$ sets.
2. **Fake correlations become certain.** Given a very large set of variables $X_1, \dots, X_p$ with $p$ large, **there is a high probability of finding an $X$ that correlates with $Y$ even if no real correlation exists in the domain.**

Point 2 is Bonferroni's principle in embryo, and the lecture's joke makes the same point:

> Data Mining, noun. Torturing the data until it confesses… and if you torture it long enough, you can get it to confess to anything.

## Check yourself
1. Define the curse of dimensionality. :: The exponential growth in the number of cells of the data space as the number of variables increases.
2. How many subsets must be searched to consider all subsets of $p$ variables? :: $2^p - 1$.
3. Why does a large number of variables guarantee spurious correlations? :: With enough candidate variables, some will correlate with the target by chance alone, even when no real relationship exists.

@@ id=m7-bonferroni | title=Bonferroni's principle | kind=concept | topic=MAT700 · L1 Bonferroni | key | tags=exam,core,definition | cards=mat700-rebuild-l1
Asked in **both** past papers. Learn the informal statement word for word.

**Setup:** Suppose you have a certain amount of data, and you look for events of a certain type within that data. You can expect events of this type to occur **even if the data is completely random**, and the number of occurrences will **grow as the size of the data grows**. These occurrences are **bogus** — they have no cause other than that random data will always have some number of unusual features that look significant but are not.

> **An informal version of Bonferroni's principle**
>
> Calculate the **expected number of occurrences** of the events you are looking for, **on the assumption that data is random**.
>
> If this number is **significantly larger than the number of real instances you hope to find**, then you must expect almost anything you find to be **bogus** — a statistical artifact rather than evidence of what you are looking for.

**The motivating example: Total Information Awareness.** In 2002 the Bush administration proposed mining credit-card receipts, hotel records, travel data and more to track terrorist activity. The concern: if you look at so much data for activities that look like terrorist behaviour, will you not find many innocent activities that result in visits from the police? **The answer depends on how narrowly you define the activities you look for.**

## Check yourself
1. State Bonferroni's principle informally. :: Compute the expected number of occurrences of the sought event assuming the data is random; if that number greatly exceeds the number of genuine instances you hope to find, essentially everything you find will be a statistical artifact.
2. What is the practical lesson for designing a search? :: Define the event narrowly enough that its expected count under randomness is small compared with the number of real instances.

@@ id=m7-birthday-triples | title=The birthday-triples calculation, worked | kind=formula | topic=MAT700 · L1 Bonferroni | key | tags=exam,calculation,probability | cards=mat700-rebuild-l1
Both papers ask this, with only the class size changed. **Learn the method, not the number.**

**Setup.** In a class of $K$ students, birthdays independent and uniform over $N = 365$ days. Find the **expectation of the number of triples of students sharing a birthday**.

**Method — linearity of expectation.**

1. There are $\binom{K}{3}$ possible triples of students.
2. A given triple shares a birthday with probability $\dfrac{1}{N} \times \dfrac{1}{N} = \dfrac{1}{N^2}$ — the second and third must match the first.
3. By linearity of expectation, sum over all triples:

$$E = \binom{K}{3}\dfrac{1}{N^2} = \dfrac{K(K-1)(K-2)}{6N^2}$$

**2024 paper, $K = 250$:**

$$\binom{250}{3} = \dfrac{250 \times 249 \times 248}{6} = 2{,}573{,}000, \qquad E = \dfrac{2{,}573{,}000}{365^2} = \dfrac{2{,}573{,}000}{133{,}225} \approx 19.3$$

**2023 paper, $K = 150$:**

$$\binom{150}{3} = \dfrac{150 \times 149 \times 148}{6} = 551{,}300, \qquad E = \dfrac{551{,}300}{133{,}225} \approx 4.14$$

**The pairs version**, for comparison: $E = \binom{K}{2}\dfrac{1}{N} = \dfrac{K(K-1)}{2N}$ — one factor of $N$, because only one other student must match.

**Do not forget the interpretation mark.** These triples are exactly Bonferroni's bogus events: about 19 triples arise from pure chance, so finding 19 triples is evidence of nothing.

## Check yourself
1. Write the general formula for the expected number of birthday triples. :: $E = \binom{K}{3}/N^2$ where $N = 365$.
2. Why is the probability $1/N^2$ and not $1/N^3$? :: The first student's birthday can be any day; only the other two must match it, giving two independent factors of $1/N$.
3. What is the corresponding formula for pairs? :: $\binom{K}{2}/N$.
4. Which principle does this calculation illustrate, and how? :: Bonferroni's — it shows how many "coincidences" appear in purely random data, so a comparable observed count carries no information.

@@ id=m7-labelled-unlabelled | title=Labelled and unlabelled data | kind=concept | topic=MAT700 · L1 Foundations | key | tags=exam,definition,core | cards=mat700-rebuild-l1
> There are two types of data, which are treated in **radically different ways**.

**Labelled data.** There is a **specially designated attribute** and the aim is to use the data given to **predict the value of that attribute for instances that have not yet been seen**. Data mining using labelled data is **supervised learning**.

| Designated attribute is… | Task |
| --- | --- |
| **categorical** — one of a number of distinct values ("very good", "good", "poor"; "car", "bicycle", "person", "bus", "taxi") | **classification** |
| **numerical** — expected sale price of a house, tomorrow's opening share price | **regression** |

**Unlabelled data.** Data that **does not have any specially designated attribute**. Mining it is **unsupervised learning**, where the aim is simply to **extract the most information we can from the data available**.

Examples given: **association rules** — IF cheese AND milk THEN bread (probability 0.7) — and **clustering**.

**Semi-supervised** is not developed in these lectures, but the 2023 paper asks for it. The safe minimal answer: **learning from a mixture of labelled and unlabelled training data**, typically a small labelled set plus a much larger unlabelled one.

## Check yourself
1. Define labelled data. :: Data with a specially designated attribute whose value we aim to predict for unseen instances.
2. What decides whether a supervised task is classification or regression? :: Whether the designated attribute is categorical or numerical.
3. Give the module's example of an association rule. :: IF cheese AND milk THEN bread, with probability 0.7.
4. What is the one-sentence definition of semi-supervised learning? :: Learning from a mixture of labelled and unlabelled data — usually a small labelled set and a much larger unlabelled one.

@@ id=m7-outlier-analysis | title=Outlier analysis | kind=concept | topic=MAT700 · L1 Foundations | tags=exam,definition
> A data set may contain objects that **do not comply with the general behaviour or model of the data**. These data objects are **outliers**.

Many data mining methods discard outliers as noise or exceptions. **However, in many applications — fraud detection, text mining, social network analysis — the rare events can be more interesting than the more regularly occurring ones.** The analysis of outlier data is called **outlier analysis** or **anomaly mining**.

**Two detection approaches:**

* statistical tests that **assume a distribution or probability model** for the data;
* **distance measures**, where objects remote from any other cluster are considered outliers.

**Example.** Outlier analysis may uncover fraudulent credit-card usage by detecting purchases of unusually large amounts for a given account compared with its regular charges — or unusual locations, types or frequencies of purchase.

The lecture's memorable case: **"Napoleon Dynamite" in the Netflix Competition** — a film whose ratings were so unpredictable it distorted the whole contest.

## Check yourself
1. Define an outlier. :: An object that does not comply with the general behaviour or model of the data.
2. Name the two families of detection method. :: Statistical tests based on an assumed probability model, and distance-based methods flagging points remote from any cluster.
3. Give an application where outliers are the point rather than the nuisance. :: Fraud detection — also text mining and social-network analysis.

@@ id=m7-learning-framework | title=The mathematical framework for learning | kind=concept | topic=MAT700 · L2 Framework | key | tags=exam,core,definition | cards=mat700-rebuild-l2
Asked directly in 2024: *"Describe the most common mathematical framework for learning."* [6 marks]. Three numbered parts — reproduce all three.

> 1. We are given **training examples** $D = \{z_1, z_2, \dots, z_n\}$, with the $z_i$ being examples **sampled from an unknown process $P(Z)$**.
> 2. We are given a **loss functional $L$** which takes as argument a **decision function $f$** from a **hypothesis space $H$**, and an example $z$, and returns a **real-valued scalar**.
> 3. We want to **minimise the expected value of $L(f, Z)$ under the unknown generating process $P(Z)$**.

**Supervised learning** in this framework: each example is an **(input, target) pair**, $z = (x, y)$, and $f$ takes $x$ as argument.

| Task | Target | Typical loss |
| --- | --- | --- |
| **Regression** | $y$ a real-valued scalar or vector; output of $f$ in the same set | squared error $L(f,(x,y)) = \|f(x) - y\|^2$ |
| **Classification** | $y$ a finite integer, a class index | negative conditional log-likelihood $L(f,(x,y)) = -\log f_y(x)$, where $f_i(x)$ estimates $P(y=i \mid x)$, subject to $f_y(x) \geq 0$ and $\sum_i f_i(x) = 1$ |

**Unsupervised learning**: we learn a function $f$ which helps **characterise the unknown distribution $P(Z)$**. Sometimes $f$ estimates $P(Z)$ directly — **density estimation**. Often $f$ characterises **where the density concentrates**: clustering algorithms divide the input space into regions, with **hard** partitions (k-means) or **soft** partitions (Gaussian mixture model, assigning each $z$ a probability of belonging to each cluster). Another kind constructs a **new representation** for $Z$.

**Ockham's razor principle: we prefer the simplest hypothesis consistent with the data.**

## Check yourself
1. State the three components of the framework. :: Training examples sampled from an unknown process $P(Z)$; a loss functional taking a decision function from a hypothesis space and an example; and the goal of minimising the expected loss under $P(Z)$.
2. What loss is standard for regression, and what for classification? :: Squared error for regression; negative conditional log-likelihood for classification.
3. What two constraints does the classification output satisfy? :: Non-negativity and summing to one over the classes.
4. State Ockham's razor as the lecture gives it. :: Prefer the simplest hypothesis consistent with the data.

@@ id=m7-instance-vs-model | title=Instance-based versus model-based learning | kind=concept | topic=MAT700 · L2 Framework | key | tags=exam,definition | cards=mat700-rebuild-l2
> There are two main approaches to generalization.

| | Mechanism |
| --- | --- |
| **Instance-based learning** | the system **learns the examples by heart**, then generalises to new cases **using a similarity measure** |
| **Model-based learning** | **build a model** of the examples, then use that model to make predictions |

kNN is the module's instance-based example; Naive Bayes, SVM and the k-means cluster centres are model-based.

**This axis is independent of supervised/unsupervised.** Do not write "instance-based learning is a type of supervised learning". Write: *instance-based versus model-based describes how generalisation is achieved; supervised versus unsupervised describes whether target labels are supplied.*

## Check yourself
1. Distinguish instance-based from model-based learning in one sentence each. :: Instance-based stores the examples and compares new cases to them by similarity; model-based fits a model and applies it to new cases.
2. Why is this not the same distinction as supervised/unsupervised? :: It describes how generalisation happens, not whether labels are available; kNN is supervised and instance-based, k-means is unsupervised and model-based.

@@ id=m7-main-steps | title=The three main steps of data mining | kind=cheatsheet | topic=MAT700 · L2 Framework | tags=exam,structure
**Step 1: Representing data in the "standard form".** A fixed number of attributes (features), chosen before the data was collected. For text mining the dataset is the documents themselves and features are extracted automatically from their content before classification. There are generally **a very large number of features, most occurring rarely, with a high proportion of noisy and irrelevant features**.

**Step 2: Distance measures and similarity measures.** A fundamental data-mining problem is to examine data for **"similar" items** — *local generalization*.

> **This is the main idea of Data Mining!**

**Step 3: Algorithms.** kNN classification, Naive Bayes, k-means, PageRank, support vector machines, AdaBoost, expectation-maximization (EM), graph mining algorithms.

That Step 2 emphasis is the lecturer's own, and it explains the shape of the module: two whole lectures go to similarity and distance before any algorithm appears.

@@ id=m7-standard-form | title=The standard form: objects, attributes, instances | kind=concept | topic=MAT700 · L2 Framework | tags=vocabulary,exam
The vocabulary the whole module runs on:

| Term | Definition |
| --- | --- |
| **Universe of objects** | all objects of interest; **normally very large, and we have only a small part of it** |
| **Variables / attributes** | the properties describing each object — both terms used interchangeably |
| **Record / instance** | the set of variable values corresponding to one object |
| **Dataset** | the complete set of data available, usually a table with one row per instance |

The aim is stated carefully: **extract information from the data available to us that we hope is applicable to the large volume of data that we have not yet seen.**

Examples given: **MNIST** (60,000 train, 10,000 test — labelled) and the **Netflix Prize** (unlabelled).

@@ id=m7-softmax | title=The softmax function | kind=formula | topic=MAT700 · L2 Softmax and entropy | key | tags=exam,formula,definition | cards=mat700-template-d
Asked in 2024 together with cross-entropy [4 marks].

> In mathematics, the **softmax function**, or **normalized exponential function**, is a generalization of the logistic function that **"squashes" a $K$-dimensional vector $z$ of arbitrary real values to a $K$-dimensional vector of real values in the range $[0,1]$ that add up to 1**.

$$\text{softmax}: \mathbb{R}^K \rightarrow [0,1]^K, \qquad \text{softmax}(z)_j = \dfrac{e^{z_j}}{\sum_{k=1}^{K} e^{z_k}}$$

for $j = 1, \dots, K$.

**In probability theory, the output of the softmax function can be used to represent a categorical distribution** — a probability distribution over $K$ different possible outcomes.

Two properties to state if asked to justify it: every output is positive because $e^x > 0$, and they sum to 1 because the denominator is exactly the sum of the numerators.

## Check yourself
1. Write the softmax formula. :: $\text{softmax}(z)_j = e^{z_j} / \sum_{k=1}^{K} e^{z_k}$.
2. What does it map, and to what? :: An arbitrary real $K$-vector to a $K$-vector in $[0,1]$ whose entries sum to 1.
3. Why do the outputs sum to 1? :: The denominator is the sum of all the numerators.
4. What can the output represent? :: A categorical distribution over $K$ outcomes.

@@ id=m7-cross-entropy | title=Cross entropy | kind=formula | topic=MAT700 · L2 Softmax and entropy | key | tags=exam,formula,definition | cards=mat700-template-d
> In information theory, the **cross entropy between two probability distributions $p$ and $q$ over the same underlying set of events** measures the **average number of bits needed to identify an event drawn from the set**, if a coding scheme is used that is **optimized for an "unnatural" probability distribution $q$, rather than the "true" distribution $p$**.

$$H(p,q) = E_p[-\log q] = H(p) + D_{KL}(p \| q)$$

where $H(p)$ is the **entropy of $p$** and $D_{KL}(p\|q)$ is the **Kullback–Leibler divergence of $q$ from $p$**, also known as the **relative entropy of $p$ with respect to $q$**.

For discrete $p$ and $q$:

$$H(p,q) = -\sum_x p(x)\log q(x)$$

**The decomposition is the examinable insight.** Cross-entropy is the true entropy plus the penalty for using the wrong distribution. Minimising cross-entropy over $q$ therefore minimises the KL divergence, since $H(p)$ does not depend on $q$ — which is why it is the standard classification loss.

## Check yourself
1. Give the discrete formula for cross entropy. :: $H(p,q) = -\sum_x p(x)\log q(x)$.
2. Decompose cross entropy into two terms and name them. :: $H(p,q) = H(p) + D_{KL}(p\|q)$ — the entropy of $p$ plus the Kullback–Leibler divergence of $q$ from $p$.
3. What does it measure operationally? :: The average number of bits to identify an event when coding is optimised for $q$ rather than the true $p$.
4. Why does minimising it make sense as a training objective? :: $H(p)$ is fixed, so minimising cross-entropy minimises the KL divergence between the model and the truth.

@@ id=m7-tfidf-definition | title=TF–IDF, defined | kind=formula | topic=MAT700 · L2 TF-IDF | key | tags=exam,formula,core | cards=mat700-template-a
Asked in **both** papers. Get the two halves exactly right — the max in the TF denominator is what people drop.

Suppose we have a collection of **$N$ documents**. Let $f_{ij}$ be the **frequency (number of occurrences) of term $i$ in document $j$**.

**Term Frequency**

$$TF_{ij} = \dfrac{f_{ij}}{\max_k f_{kj}}$$

**Thus the most frequent term in document $j$ gets a TF of 1, and other terms get fractions.**

**Inverse Document Frequency.** Suppose term $i$ appears in **$n_i$ of the $N$ documents**:

$$IDF_i = \log_2 \dfrac{N}{n_i}$$

**TF–IDF score** for term $i$ in document $j$:

$$TF_{ij} \times IDF_i$$

> The terms with the **highest TF–IDF score** are often the terms that **best characterize the topic** of the document.

**Why it is built this way** — the lecture's argument, which is worth an explanation mark:

* the most frequent words are *not* the significant ones; the indicators of topic are **relatively rare** words;
* but not all rare words are useful — "notwithstanding" and "albeit" are rare and tell you nothing;
* the difference is **concentration**: a useful rare word like "chukker" is **repeated** within the few documents it appears in, whereas "albeit" appearing once does not make a second occurrence likely.

**The lecture's worked example.** Repository of $2^{20} = 1{,}048{,}576$ documents; word $w$ appears in $2^{10} = 1024$ of them, so $IDF_w = \log_2(2^{20}/2^{10}) = \log_2(2^{10}) = 10$.

* In document $j$, $w$ appears 20 times and that is the maximum for any word: $TF_{wj} = 1$, score $= 10$.
* In document $k$, $w$ appears once and the maximum is 20: $TF_{wk} = 1/20$, score $= 1/2$.

## Check yourself
1. Write both halves of TF–IDF. :: $TF_{ij} = f_{ij}/\max_k f_{kj}$ and $IDF_i = \log_2(N/n_i)$; the score is their product.
2. What is the maximum possible value of TF, and when does it occur? :: 1, for the most frequent term in that document.
3. Why are the most frequent words not the most informative? :: They are common across all documents; topic indicators are relatively rare words that are concentrated and repeated within the few documents containing them.
4. Distinguish "albeit" from "chukker" in TF–IDF terms. :: Both are rare, so both have high IDF — but "chukker" is repeated within its documents, giving it a high TF there too, while "albeit" appears once and gets a low TF.

@@ id=m7-tfidf-bound | title=Proof: the TF–IDF bound | kind=formula | topic=MAT700 · L2 TF-IDF | key | tags=exam,proof,calculation | cards=mat700-template-a
Both papers ask a version of this. 2024: *"Show that in a corpus of 1500 documents, any word in any document has a TF–IDF score less than 11."* 2023: the same with 500 documents and the bound 9.

**Proof.**

1. $TF_{ij} = \dfrac{f_{ij}}{\max_k f_{kj}} \leq 1$, since the numerator is one of the terms the maximum is taken over.
2. $IDF_i = \log_2\dfrac{N}{n_i}$ is largest when $n_i$ is smallest. A word appearing in the document appears in **at least one** document, so $n_i \geq 1$ and $IDF_i \leq \log_2 N$.
3. Therefore $TF_{ij} \times IDF_i \leq 1 \times \log_2 N = \log_2 N$.

**For $N = 1500$:** $\log_2 1500 = \dfrac{\ln 1500}{\ln 2} \approx \dfrac{7.313}{0.693} \approx 10.55 < 11$. ∎

**For $N = 500$:** $\log_2 500 \approx 8.97 < 9$. ∎

**Useful powers of 2 to have on the A4 sheet**, so you can bound $\log_2 N$ without a calculator: $2^9 = 512$, $2^{10} = 1024$, $2^{11} = 2048$. Since $1024 < 1500 < 2048$, immediately $10 < \log_2 1500 < 11$ — which answers the question without any arithmetic at all.

## Check yourself
1. What are the two bounds that make the proof work? :: $TF \leq 1$ because the denominator is the maximum frequency, and $IDF \leq \log_2 N$ because $n_i \geq 1$.
2. Show $\log_2 1500 < 11$ without a calculator. :: $2^{11} = 2048 > 1500$, so $\log_2 1500 < 11$.
3. What is the general bound on any TF–IDF score in a corpus of $N$ documents? :: $\log_2 N$.

@@ id=m7-tfidf-numeric | title=TF–IDF, worked numerically | kind=formula | topic=MAT700 · L2 TF-IDF | key | tags=exam,calculation | cards=mat700-template-a
The 2024 paper's calculation [3 marks]:

> A repository of **256 documents**; word $w$ appears in **64** of them. In document $D$ the **maximum number of occurrences of any word is 45**. What is the TF–IDF score for $w$ in $D$ if $w$ appears **six times** in $D$?

**Solution.**

$$IDF_w = \log_2\dfrac{256}{64} = \log_2 4 = 2$$

$$TF_{wD} = \dfrac{6}{45} = \dfrac{2}{15}$$

$$TF \times IDF = \dfrac{2}{15} \times 2 = \dfrac{4}{15} \approx 0.267$$

**Method checklist for any variant of this question:**

1. Identify $N$ (corpus size) and $n_i$ (documents containing the word) → $IDF$.
2. Identify $f_{ij}$ (occurrences in this document) and $\max_k f_{kj}$ (the most frequent word in this document) → $TF$.
3. Multiply. Leave it as an exact fraction unless a decimal is requested.

The numbers are always chosen so $N/n_i$ is a power of 2 — if your $\log_2$ is not an integer, you have misread the question.

## Check yourself
1. A corpus of 1024 documents; the word appears in 32 of them. What is IDF? :: $\log_2(1024/32) = \log_2 32 = 5$.
2. In a document the target word occurs 8 times and the commonest word occurs 40 times. What is TF? :: $8/40 = 1/5$.
3. What is the TF–IDF for those two together? :: $1/5 \times 5 = 1$.

@@ id=m7-vector-space-model | title=Vector space model and the document-term matrix | kind=concept | topic=MAT700 · L2 TF-IDF | tags=exam,text-mining
Once every document has a TF–IDF score for every term, a corpus becomes a **document–term matrix**: rows are documents, columns are terms, entries are TF–IDF scores. Each document is then a **vector** in term-space, and document similarity becomes a geometric question — typically **cosine distance**, since we do not want document length to dominate.

The 2023 paper gives a document-term matrix and asks for **the corresponding TF–IDF matrix** [4 marks]. Method: for each column (term) count $n_i$ = how many documents have a non-zero entry, compute $IDF_i = \log_2(N/n_i)$; for each row (document) find the maximum raw count and divide; multiply the two.

**Textual data preparation**, the three steps before any of this:

1. **Words and sentences extraction**
2. **Removing stop words**
3. **Stemming**

## Check yourself
1. What are the three text-preparation steps? :: Extract words and sentences, remove stop words, and stem.
2. How do you build a TF–IDF matrix from a document–term count matrix? :: Per column, count the documents with non-zero entries to get $n_i$ and hence $IDF_i$; per row, divide each count by the row maximum to get TF; multiply.

@@ id=m7-graph-basics | title=Graph theory: the definitions | kind=cheatsheet | topic=MAT700 · L2 Graph theory | key | tags=exam,definition,graphs | cards=mat700-template-b
> Formally, a graph $G = (V,E)$ is a mathematical structure consisting of a **finite nonempty set $V$ of vertices or nodes**, and a **set $E \subseteq V \times V$ of edges** consisting of unordered pairs of vertices.

| Term | Definition |
| --- | --- |
| **Loop** | an edge from a node to itself, $(v_i, v_i)$ |
| **Simple graph** | an undirected graph **without loops** — assumed throughout unless stated |
| **Incident** | edge $e = (v_i,v_j)$ is incident with $v_i$ and $v_j$ |
| **Adjacent / neighbours** | $v_i$ and $v_j$ joined by an edge; written $v_i \sim v_j$ |
| **Order** | the number of nodes, $\|V\| = n$ |
| **Size** | the number of edges, $\|E\| = m$ |
| **Digraph** | edge set consists of **ordered** pairs; a directed edge is an **arc** |
| **Tail / head** | of arc $(v_i,v_j)$: $v_i$ is the tail, $v_j$ the head |
| **Weighted graph** | a graph plus a weight $w_{ij}$ for each edge; weights are real and **always assumed strictly positive** |

**Every graph can be considered a weighted graph in which the edges have weight one.**

**Degree.** The **degree** of node $v_i$ is the **number of edges incident with it**, written $d(v_i)$ or $d_i$. For directed graphs, the **indegree** $id(v_i)$ is the number of **incoming** edges; the **outdegree** $od(v_i)$ is the number of **outgoing** edges.

## Check yourself
1. What makes a graph simple? :: It is undirected and has no loops.
2. Distinguish the order and the size of a graph. :: Order is the number of vertices $|V|$; size is the number of edges $|E|$.
3. Define indegree and outdegree. :: Indegree counts edges with the node as head (incoming); outdegree counts edges with it as tail (outgoing).

@@ id=m7-graph-paths | title=Walks, trails, paths, cycles and distance | kind=cheatsheet | topic=MAT700 · L2 Graph theory | key | tags=exam,definition,graphs
> A **walk** between $x$ and $y$ is an ordered sequence of vertices $x = v_0, v_1, \dots, v_t = y$ such that there is an edge between every pair of consecutive vertices.

The **length** of the walk, $t$, is measured in **hops** — the number of edges along it.

| Term | Restriction |
| --- | --- |
| **Walk** | **no restriction** — both vertices and edges may repeat |
| **Trail** | a walk with **distinct edges** |
| **Path** | a walk with **distinct vertices** (except possibly the start and end) |
| **Closed** walk | starts and ends at the same vertex |
| **Cycle** | a closed path of length $t \geq 3$ — begins and ends at the same vertex, distinct nodes |

**Distance.** A path of minimum length between $x$ and $y$ is a **shortest path**, and its length is the **distance** $d(x,y)$. **If no path exists, $d(x,y) = \infty$.**

**Connectedness.** Two nodes are **connected** if a path exists between them. A **graph is connected** if there is a path between all pairs of vertices. A **connected component** is a **maximal connected subgraph**. A directed graph is **strongly connected** if there is a directed path between all *ordered* pairs, and **weakly connected** if paths exist only when edges are treated as undirected.

**The lecture's worked example.** In its 8-vertex graph: $(v_3,v_1,v_2,v_5,v_1,v_2,v_6)$ is a **walk** of length 6 ($v_1,v_2$ repeat); $(v_3,v_4,v_7,v_8,v_5,v_2,v_6)$ is a **path** of length 6; but the shortest path is $(v_3,v_1,v_2,v_6)$ of length 3, so $d(v_3,v_6) = 3$.

## Check yourself
1. Distinguish walk, trail and path. :: A walk has no repetition restriction; a trail has distinct edges; a path has distinct vertices.
2. What is the minimum length of a cycle? :: 3.
3. What is the distance between two nodes in different components? :: Infinity — no path exists.
4. Distinguish strongly and weakly connected. :: Strongly connected means a directed path exists between every ordered pair; weakly connected means paths exist only if you ignore edge directions.

@@ id=m7-adjacency-matrix | title=Adjacency matrices | kind=formula | topic=MAT700 · L2 Graph theory | key | tags=exam,graphs,calculation | cards=mat700-template-b
Asked in 2024: *"Find the adjacency matrices of the following graphs"* [4 marks].

A graph with $|V| = n$ vertices is represented by an $n \times n$ **symmetric binary adjacency matrix**:

$$A(i,j) = \begin{cases} 1 & \text{if } v_i \text{ is adjacent to } v_j \\ 0 & \text{otherwise} \end{cases}$$

**If the graph is directed, $A$ is not symmetric**, since $(v_i,v_j) \in E$ does not imply $(v_j,v_i) \in E$.

**If the graph is weighted**, the entries are the weights $w_{ij}$ instead of 1. A weighted adjacency matrix can be converted to a binary one with a threshold $\tau$: $A(i,j) = 1$ if $w_{ij} \geq \tau$.

**Exam method.** Label the vertices in the order given (usually $v_1 \dots v_n$ or A, B, C…), write the $n \times n$ grid, and fill row by row. Two checks before you move on:

1. **Undirected → the matrix must be symmetric.** If it is not, you have missed an entry.
2. **Row $i$ sums to $\deg(v_i)$** (undirected, no loops). This catches almost every slip.
3. The diagonal is **all zeros** for a simple graph.

## Check yourself
1. When is an adjacency matrix not symmetric? :: When the graph is directed.
2. What does row $i$ of an undirected adjacency matrix sum to? :: The degree of $v_i$.
3. What is on the diagonal of a simple graph's adjacency matrix, and why? :: All zeros — a simple graph has no loops.

@@ id=m7-degree-sum-proof | title=Proof: sum of degrees equals twice the edges | kind=formula | topic=MAT700 · L2 Graph theory | key | tags=exam,proof,graphs | cards=mat700-template-b
The 2024 paper, Q3(b) [4 marks]: *"Let $G = (V,E)$ be an undirected graph. Show that $\sum_{v \in V}\deg(v) = 2|E|$."*

**Proof (double counting).** Count the set of **incidences** — pairs $(v, e)$ where vertex $v$ is an endpoint of edge $e$ — in two ways.

*Counting by vertices.* Each vertex $v$ belongs to exactly $\deg(v)$ incidences, by the definition of degree. So the total number of incidences is $\sum_{v \in V}\deg(v)$.

*Counting by edges.* Each edge is undirected with two distinct endpoints (the graph is simple, so there are no loops), and therefore contributes exactly 2 incidences. So the total is $2|E|$.

The two counts enumerate the same finite set, hence

$$\sum_{v \in V}\deg(v) = 2|E| \qquad \blacksquare$$

**The corollary that often earns the last mark:** since the left side is $2|E|$, an even number, **the number of vertices of odd degree must be even** — the "handshaking lemma".

**Where loops matter.** If loops were allowed, a loop at $v$ contributes **2** to $\deg(v)$ by convention, and the result still holds. Say so if the question does not specify a simple graph.

## Check yourself
1. What is the proof technique? :: Double counting — count vertex–edge incidences by vertices and by edges, and equate.
2. Why does each edge contribute exactly 2? :: It has two distinct endpoints, so it appears in the degree count of each of them once.
3. State the handshaking corollary. :: The number of vertices of odd degree is even, because the degree sum is even.
