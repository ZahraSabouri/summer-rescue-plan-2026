@@ id=m7-pagerank-idea | title=PageRank: the idea and the transition matrix | kind=concept | topic=MAT700 · L5 PageRank | key | tags=exam,definition,core | cards=mat700-rebuild-l5
> **PageRank is a function that assigns a real number to each page in the Web.** The intent is that **the higher the PageRank of a page, the more "important" it is.**

Think of the Web as a **directed graph**: pages are nodes, and there is an arc from $p_1$ to $p_2$ if there are one or more links from $p_1$ to $p_2$.

**Two motivations for simulating random surfers:**

* Users of the Web **"vote with their feet"** — they place links to pages they think are good, rather than useless ones.
* **The behaviour of a random surfer indicates which pages users are likely to visit**, and users are more likely to visit useful pages.

> **Definition (Transition Matrix of the Web).** The matrix $M$ has $n$ rows and columns if there are $n$ pages. The element $m_{ij}$ in row $i$ and column $j$ has value **$1/k$ if page $j$ has $k$ arcs out, and one of them is to page $i$**. Otherwise $m_{ij} = 0$.

**Read the indices carefully: column $j$ is the *source*, row $i$ the *destination*.** Each column sums to 1 (if the page has at least one out-link). This is the commonest place to lose marks — building the transpose gives a plausible-looking matrix and a wrong answer.

**Historical context worth a sentence.** Google was not the first search engine but **the first able to defeat the spammers**. Early engines were ruined by **term spam** — fooling a search engine into believing a page is about something it is not. Google's two innovations were **simulation of random surfers**, and judging a page's content **not only by the terms on it but by the terms used in or near the links to it**.

## Check yourself
1. Give the definition of the transition matrix entry $m_{ij}$. :: $1/k$ if page $j$ has $k$ out-arcs and one goes to page $i$; otherwise 0.
2. Which index is the source and which the destination? :: Column $j$ is the source page, row $i$ the destination.
3. What do the columns of $M$ sum to, and when does that fail? :: 1 — except for dead ends, which have no out-links, giving a column of zeros.
4. What is term spam? :: Techniques for fooling a search engine into believing a page is about something it is not.

@@ id=m7-pagerank-idealized | title=The idealized PageRank and why it converges | kind=concept | topic=MAT700 · L5 PageRank | key | tags=exam,core,linear-algebra | cards=mat700-rebuild-l5
The probability distribution for the location of a random surfer is a **column vector whose $j$th component is the probability the surfer is at page $j$**. This is the **idealized PageRank function**.

Start a surfer at any of the $n$ pages with equal probability, so $v_0$ has $1/n$ in each component. After one step the distribution is $Mv_0$; after two, $M^2v_0$; in general **multiplying $v_0$ by $M$ a total of $i$ times gives the distribution after $i$ steps**.

> This is an example of the ancient theory of **Markov processes**. The distribution approaches a **limiting distribution $v$ satisfying $v = Mv$**, provided **the graph is strongly connected** — it is possible to get from any node to any other node.

**Because $M$ is stochastic** — its columns each add up to 1 — **$v$ is the principal eigenvector**, and **the eigenvalue associated with the principal eigenvector is 1**.

**Why iterate rather than solve directly?**

> You might think the way to solve $v = Mv$ is by Gaussian elimination. However, in realistic examples with tens or hundreds of billions of nodes, Gaussian elimination is **not feasible** — it takes time **cubic in the number of equations**. The only way to solve equations on this scale is to iterate.

**In practice, for the Web itself, 50–75 iterations suffice** to converge within the error limits of double-precision arithmetic.

## Check yourself
1. What equation does the limiting distribution satisfy? :: $v = Mv$ — it is a fixed point of the transition.
2. What condition guarantees convergence? :: The graph must be strongly connected.
3. What is the eigenvalue of the principal eigenvector, and why? :: 1, because $M$ is stochastic (its columns sum to 1).
4. Why not use Gaussian elimination? :: Its cost is cubic in the number of equations, which is impossible at web scale; iteration is the only feasible route.

@@ id=m7-pagerank-deadends-traps | title=Dead ends, spider traps and taxation | kind=concept | topic=MAT700 · L5 PageRank | key | tags=exam,core | cards=mat700-rebuild-l5
**It would be nice if the Web were strongly connected. However, it is not.** Two problems:

**1. Dead ends** — a page with no links out. Surfers reaching such a page disappear, and **in the limit no page that can reach a dead end has any PageRank at all**.

If dead ends are allowed the transition matrix is **no longer stochastic**, since some columns sum to 0 rather than 1. **A matrix whose column sums are at most 1 is called substochastic.** Computing $M^i v$ for a substochastic $M$ sends some or all components to 0 — **importance "drains out" of the Web**.

*The fix:* **add a complete set of outgoing links from each dead-end page to all pages** — transition probability $1/n$ to every page. That is, **replace each all-zero column with $e/n$**, where $e$ is the $n$-vector of all 1s.

**2. Spider traps** — a set of nodes with no dead ends **but no arcs out**. These **cause the PageRank calculation to place all the PageRank within the spider trap**. In the one-node example, all the PageRank ends up at $C$, since a random surfer who reaches $C$ can never leave.

*The fix:* **taxation**. Allow each random surfer a **small probability of teleporting to a random page** rather than following an out-link.

## Check yourself
1. Define a dead end and a spider trap. :: A dead end is a page with no out-links; a spider trap is a set of nodes that have out-links but none leaving the set.
2. What is a substochastic matrix, and what does it do to PageRank? :: One whose column sums are at most 1; iterating it drains importance towards zero.
3. Give the fix for each problem. :: Dead ends: replace each zero column with $e/n$, linking that page to every page. Spider traps: taxation, i.e. teleportation with probability $1-\beta$.

@@ id=m7-pagerank-formula | title=The PageRank formula with taxation | kind=formula | topic=MAT700 · L5 PageRank | key | tags=exam,formula,core | cards=mat700-rebuild-l5
The full model, after adding a link from every page to every page with a small transition probability controlled by $\beta$:

$$v' = (1-\beta)\dfrac{E}{n} + \beta M v$$

where $E = ee^T$ is the $n \times n$ matrix of all 1s. Since each column of $E/n$ contributes $1/n$ to every component, this simplifies to the form you actually compute with:

$$v' = (1-\beta)\dfrac{e}{n} + \beta M v$$

where $e$ is the column vector of all 1s.

* **$\beta$ is the damping factor**, set between 0 and 1. **$\beta = 0.85$ is used in Google.**
* **Equation assumes $M$ has already been made stochastic** — i.e. dead ends have been fixed first.
* The **iterative step** computes a new estimate $v'$ from the current estimate $v$ and repeats until the change is small.

**Reading the two terms.** With probability $\beta$ the surfer follows a link ($\beta M v$); with probability $1-\beta$ they teleport to a uniformly random page ($(1-\beta)/n$ each). The teleport term guarantees **every page gets at least $(1-\beta)/n$**, which is exactly what stops spider traps absorbing everything.

**The lecture's worked case** uses $\beta = 0.8$ with $n = 4$, so each component of $(1-\beta)e/n$ is $\dfrac{1/5}{4} = \dfrac{1}{20}$, and $M$'s elements are each multiplied by $4/5$. The outcome: **by being a spider trap, $C$ gets more than half the PageRank — but the effect is limited, and every node gets some.**

## Check yourself
1. Write the PageRank iteration. :: $v' = (1-\beta)e/n + \beta M v$.
2. What value of $\beta$ does Google use? :: 0.85.
3. What must be true of $M$ before applying the formula? :: It must already be stochastic — dead ends fixed by replacing zero columns with $e/n$.
4. What is the minimum PageRank any page can have? :: $(1-\beta)/n$, from the teleport term alone.

@@ id=m7-pagerank-worked | title=Computing PageRank by hand | kind=formula | topic=MAT700 · L5 PageRank | key | tags=exam,calculation | cards=mat700-template-c
Both papers ask for a numeric PageRank; 2024 specifies $\beta = 0.8$ [5 marks]. Here is the procedure that gets full marks in the time available.

**Step 1 — write the transition matrix $M$.** For each page $j$ (a **column**), find its out-degree $k$ and put $1/k$ in the row of every page it links to. Check: **every column sums to 1**.

**Step 2 — fix dead ends** if any column is all zeros: replace it with $1/n$ throughout.

**Step 3 — set up the iteration.** With $\beta = 0.8$ and $n$ pages, the constant term is $(1-\beta)/n = 0.2/n$ in every component:

$$v' = \dfrac{0.2}{n}e + 0.8\,Mv, \qquad v_0 = \dfrac{1}{n}e$$

**Step 4 — iterate.** For each component of the new vector: multiply the appropriate row of $M$ by $v$, scale by 0.8, add $0.2/n$. Two or three iterations are usually all the marks require — **state how many you did**.

**Step 5 — sanity checks.** After every iteration:

* the components should **sum to 1**;
* a page with **no in-links** should sit at exactly $(1-\beta)/n = 0.05$ for $n=4$;
* pages with more or better in-links should be rising.

**If asked for the exact answer instead of iterations**, solve $v = (1-\beta)e/n + \beta Mv$ as a linear system, i.e. $(I - \beta M)v = (1-\beta)e/n$, together with $\sum_i v_i = 1$. For a 3- or 4-node graph this is quicker and exact — but check whether the question says "compute" (iterate) or "find" (solve).

## Check yourself
1. What is the first check on your transition matrix? :: Every column sums to 1.
2. With $\beta = 0.8$ and $n = 4$, what is the constant added to every component each iteration? :: $0.2/4 = 0.05$.
3. What should the components of $v$ always sum to? :: 1.
4. How do you get an exact answer rather than an iterate? :: Solve the linear system $(I - \beta M)v = (1-\beta)e/n$ with the constraint that the components sum to 1.

@@ id=m7-pagerank-outlinks-proof | title=Proof: pages with only out-links share a PageRank | kind=formula | topic=MAT700 · L5 PageRank | key | tags=exam,proof | cards=mat700-template-c
The 2023 paper [5 marks]: *"Prove that any two web-pages with only out-links have the same PageRank value."*

**Reading the question.** "Only out-links" means the page has out-links but **no in-links** — no other page points to it.

**Proof.** The PageRank equation is

$$v = (1-\beta)\dfrac{e}{n} + \beta M v$$

Component-wise, for page $i$:

$$v_i = \dfrac{1-\beta}{n} + \beta\sum_{j} m_{ij}v_j$$

By definition $m_{ij} \neq 0$ only when page $j$ has a link to page $i$ — that is, only when $i$ has an in-link from $j$.

Now suppose page $i$ has **no in-links**. Then $m_{ij} = 0$ for every $j$, so the entire sum vanishes and

$$v_i = \dfrac{1-\beta}{n}$$

This value depends only on $\beta$ and $n$, **not on $i$**. Hence if $p$ and $q$ are two pages each having no in-links,

$$v_p = \dfrac{1-\beta}{n} = v_q \qquad \blacksquare$$

**The intuition to state alongside it:** such a page can only ever be reached by teleportation, and teleportation is uniform — so every page reachable only that way receives exactly the same share.

## Check yourself
1. What does "a page with only out-links" mean for its row of $M$? :: The row is entirely zero, since $m_{ij}$ is non-zero only when $j$ links to $i$.
2. What is the resulting PageRank value? :: $(1-\beta)/n$, the teleport contribution alone.
3. What is the one-line intuition? :: The page can only be reached by teleporting, and teleportation is uniform over all pages.

@@ id=m7-clustering-strategies | title=Two clustering strategies | kind=concept | topic=MAT700 · L6 Clustering | key | tags=exam,definition | cards=mat700-rebuild-l6
> **Clustering is the process of examining a collection of "points," and grouping the points into "clusters" according to some distance measure.** The goal is that points in the same cluster have a **small distance from one another**, while points in different clusters are at a **large distance** from one another.

**Two fundamentally different strategies:**

| | Method |
| --- | --- |
| **Hierarchical / agglomerative** | **start with each point in its own cluster**; clusters are **combined based on their "closeness"**. Combination stops when further combination leads to undesirable clusters — e.g. a predetermined number of clusters is reached, or a compactness measure is violated. |
| **Point assignment** | points are **considered in some order and each assigned to the cluster into which it best fits**. Normally preceded by a short phase estimating initial clusters. Variations allow **combining or splitting** clusters, or leaving points **unassigned if they are outliers**. |

**A second, independent axis:** whether the algorithm assumes a **Euclidean space** or works for an **arbitrary distance measure**.

> A **key distinction** is that in a Euclidean space it is possible to summarize a collection of points by their **centroid** — the average of the points. **In a non-Euclidean space, there is no notion of a centroid**, and we are forced to develop another way to summarize clusters.

## Check yourself
1. Name the two clustering strategies and their starting points. :: Hierarchical/agglomerative starts with every point in its own cluster and merges; point assignment assigns each point to the best-fitting existing cluster.
2. What can you do in a Euclidean space that you cannot do otherwise? :: Summarise a cluster by its centroid, the average of its points.

@@ id=m7-hierarchical | title=Hierarchical clustering and the clustroid | kind=concept | topic=MAT700 · L6 Clustering | key | tags=exam,algorithm | cards=mat700-rebuild-l6
**The algorithm in three decisions.** Begin with every point in its own cluster; larger clusters are built by combining two smaller ones. Decide in advance:

* **How will clusters be represented?**
* **How will we choose which two clusters to merge?**
* **When will we stop combining clusters?**

```text
WHILE it is not time to stop DO
    pick the best two clusters to merge;
    combine those two clusters into one cluster;
END;
```

**In a Euclidean space** represent a cluster by its **centroid**. In a cluster of one point, that point is the centroid, so initialisation is straightforward. Merging rule: **the distance between two clusters is the Euclidean distance between their centroids**; pick the two at the shortest distance.

**Alternative inter-cluster distances** the lecture lists:

* the **minimum** of the distances between any two points, one from each cluster;
* the **average** distance of all pairs of points, one from each cluster;
* the **radius** — the maximum distance between all the points and the centroid — merging the pair whose result has the **lowest radius**;
* the **diameter** — the maximum distance between any two points of the cluster — merging to get the **smallest diameter**.

**In non-Euclidean spaces** we cannot average points, so **our only choice is to pick one of the points of the cluster itself to represent it**. This representative is the **clustroid**, ideally close to all points in the cluster. Common choices minimise:

* the **sum of the distances** to the other points;
* the **maximum distance** to another point;
* the **sum of the squares of the distances** to the other points.

**Centroid vs clustroid is a favourite distinction:** the centroid is an **average, and need not be a data point**; the clustroid **is an actual point of the cluster**.

## Check yourself
1. What three decisions define a hierarchical clustering algorithm? :: How clusters are represented, which two to merge, and when to stop.
2. Distinguish centroid from clustroid. :: The centroid is the average of the points and generally is not one of them; the clustroid is an actual member point chosen to be central.
3. Give three ways of choosing the clustroid. :: Minimise the sum of distances, the maximum distance, or the sum of squared distances to the other points.

@@ id=m7-kmeans-algorithm | title=The k-means algorithm | kind=formula | topic=MAT700 · L6 Clustering | key | tags=exam,algorithm,core | cards=mat700-template-c
Asked in **both** papers: *"Formulate the k-means algorithm. What is the objective function?"* [6–7 marks].

**Assumptions:** a **Euclidean space**, and **$k$ known in advance** — though $k$ can be deduced by trial and error.

> **The k-Means Clustering Algorithm**
>
> 1. Choose a value of $k$.
> 2. Select $k$ objects in an arbitrary fashion. Use these as the **initial set of $k$ centroids**.
> 3. **Assign each of the objects to the cluster for which it is nearest to the centroid.**
> 4. **Recalculate the centroids** of the $k$ clusters.
> 5. **Repeat steps 3 and 4 until the centroids no longer move.**

**The objective function** — the **within-cluster variation**, the sum of squared error between all objects in $C_i$ and the centroid $c_i$:

$$E = \sum_{i=1}^{k}\sum_{p \in C_i} dist(p, c_i)^2$$

**Complexity.** Optimizing the within-cluster variation is computationally challenging — in the worst case we would have to enumerate exponentially many partitionings. **The problem is NP-hard in general Euclidean space even for two clusters ($k=2$), and NP-hard for general $k$ even in 2-D.** So **greedy approaches are used in practice**, and k-means is the prime example.

**Two caveats to quote:**

* **k-means will always terminate, but it does not necessarily find the best set of clusters** — it need not minimise the objective function.
* **The initial selection of centroids can significantly affect the result.** Remedy: run it several times with different initial centroids and take the set of clusters with the **smallest objective value**.

**Initialisation strategies:** (1) pick points **as far away from one another as possible**; (2) **cluster a sample** of the data, perhaps hierarchically, into $k$ clusters and take one point from each — perhaps the one closest to that cluster's centroid.

## Check yourself
1. State the five steps of k-means. :: Choose $k$; pick $k$ arbitrary initial centroids; assign each object to the nearest centroid; recompute the centroids; repeat the last two until the centroids stop moving.
2. Write the objective function. :: $E = \sum_{i=1}^{k}\sum_{p\in C_i} dist(p,c_i)^2$ — the within-cluster sum of squared error.
3. Is k-means guaranteed to find the optimum? :: No — it always terminates, but only at a local optimum; the result depends on initialisation.
4. What is the complexity result? :: Minimising the within-cluster variation is NP-hard even for $k=2$ in general Euclidean space, and for general $k$ even in two dimensions.

@@ id=m7-kmeans-convergence | title=Proof: k-means converges | kind=formula | topic=MAT700 · L6 Clustering | key | tags=exam,proof,core | cards=mat700-template-c
The 2024 paper asks for this explicitly [part of 7 marks]: *"Prove the convergence of the k-means algorithm."*

**Claim.** The k-means algorithm terminates after finitely many iterations.

**Proof.** Write the objective as a function of both the assignment $A$ (which cluster each point belongs to) and the centroids $C = \{c_1,\dots,c_k\}$:

$$E(A, C) = \sum_{i=1}^{k}\sum_{p \in C_i} dist(p,c_i)^2$$

Each iteration performs two steps, and **neither can increase $E$**.

**Step 3 (assignment), centroids fixed.** Each point $p$ is reassigned to the cluster whose centroid is nearest. For each point individually, the term $dist(p, c_i)^2$ contributed after reassignment is the **minimum** over all $i$, so it is no larger than the term contributed before. Summing over all points, $E$ does not increase.

**Step 4 (update), assignment fixed.** For a fixed cluster $C_i$, consider $f(c) = \sum_{p \in C_i} dist(p,c)^2$. Differentiating with respect to $c$ and setting to zero gives

$$\sum_{p \in C_i} 2(c - p) = 0 \implies c = \dfrac{1}{|C_i|}\sum_{p \in C_i}p$$

so the **mean is the unique minimiser** of the within-cluster sum of squares. Replacing each centroid by its cluster mean therefore cannot increase $E$.

**Conclusion.** $E$ is **non-increasing** across iterations and **bounded below by 0**. Moreover there are only **finitely many possible assignments** of $n$ points to $k$ clusters (at most $k^n$), and $E$ is determined by the assignment once centroids are set to the cluster means. A non-increasing sequence taking values in a finite set must become constant after finitely many steps; once $E$ stops strictly decreasing the assignment no longer changes, so the centroids no longer move and the algorithm halts. ∎

**State the caveat.** This proves **convergence, not optimality** — the algorithm halts at a **local** minimum, which is why the lecture recommends multiple restarts.

## Check yourself
1. What two facts about each step drive the proof? :: The assignment step picks the nearest centroid for each point, and the mean is the unique minimiser of the within-cluster squared distance — so neither step increases $E$.
2. Why must the algorithm stop rather than decrease forever? :: $E$ is bounded below by 0 and there are only finitely many assignments, so the strictly decreasing sequence must terminate.
3. What does the proof *not* establish? :: Optimality — k-means converges to a local minimum, not necessarily the global one.

@@ id=m7-meta-algorithm | title=Meta-algorithms and online learning | kind=concept | topic=MAT700 · L7 Experts | key | tags=exam,definition | cards=mat700-rebuild-l7
Asked in **both** papers: *"What is a meta-algorithm?"*

> **Definition (Meta Algorithms): Algorithms operating on algorithms.**

The motivation: if you were going to make an important decision, you would **get the advice of multiple experts instead of trusting one person** — why should machine learning be different? **Meta-algorithms are a way of combining other algorithms.** AdaBoost is considered by some to be the best supervised learning algorithm.

**Online learning.** So far the algorithms assumed **all the training data is available before building a model**. In many modern applications **data is available only in a streaming fashion**, and one needs to **predict labels on the fly**.

> **Online learning proceeds in rounds.** At each round:
> 1. a training example is **revealed** to the learning algorithm;
> 2. the algorithm **uses its current model to predict the label**;
> 3. the **true label is then revealed**;
> 4. the learner **incurs a loss**;
> 5. the learner **updates its model** based on the feedback provided.

Those five stages are worth reproducing as a numbered list — it is a definition question, and the marks are for completeness.

## Check yourself
1. Define a meta-algorithm in four words. :: Algorithms operating on algorithms.
2. Give the five stages of an online learning round. :: An example is revealed; the learner predicts; the true label is revealed; a loss is incurred; the model is updated.
3. What distinguishes online from offline learning? :: Offline assumes all training data is available up front; online receives data in a stream and must predict as it arrives.

@@ id=m7-halving-algorithm | title=The halving algorithm | kind=formula | topic=MAT700 · L7 Experts | key | tags=exam,algorithm,core | cards=mat700-rebuild-l7
**Setup.** We have access to a set of **$n$ experts** — functions $f_i$ mapping from the input space $X$ to the output space $Y = \{\pm\}$. Assume **one of the experts is consistent**: there exists $j$ such that $f_j(x_t) = y_t$ for all $t = 1,\dots,T$.

**The algorithm** maintains a set $C_t$ of **consistent experts** at time $t$. Initially $C_0 = \{1,2,\dots,n\}$, updated recursively as

$$C_{t+1} = \{i \in C_t : f_i(x_{t+1}) = y_{t+1}\}$$

— that is, **discard every expert that just got it wrong.**

**Prediction** on a new data point is by **majority vote amongst the consistent experts**:

$$\tilde{y}_t = \text{majority}(C_t)$$

**The consistency assumption is essential.** It guarantees $C_t$ is never empty, which is exactly what the mistake-bound proof needs. When **no expert is consistent**, halving breaks down and you need the **weighted majority** algorithm instead — that is the reason Lecture 7 introduces the second algorithm.

## Check yourself
1. What does the halving algorithm maintain, and how is it updated? :: The set of still-consistent experts; every expert that predicts wrongly on the newest example is removed.
2. How does it predict? :: By majority vote among the currently consistent experts.
3. What assumption does it require, and what happens without it? :: That at least one expert is consistent throughout; without it the consistent set could empty and you must use weighted majority instead.

@@ id=m7-halving-proof | title=Proof: halving makes at most log2(n) mistakes | kind=formula | topic=MAT700 · L7 Experts | key | tags=exam,proof,core | cards=mat700-template-d
Asked in **both** papers [5 marks]. Short, elegant, and worth having word-perfect.

> **Theorem.** The halving algorithm makes at most $\log_2(n)$ mistakes.

**Proof.** Let $M$ denote the total number of mistakes.

**Step 1 — a mistake halves the consistent set.** The algorithm predicts by majority vote, so it makes a mistake at iteration $t$ **only if at least half the consistent experts $C_t$ predicted the wrong label**. All of those experts are then removed from the set. Therefore

$$|C_{t+1}| \leq \dfrac{|C_t|}{2}$$

**Step 2 — accumulate over all mistakes.** Rounds on which no mistake occurs cannot increase $|C_t|$. So after $M$ mistakes,

$$|C_{T+1}| \leq \dfrac{|C_0|}{2^M} = \dfrac{n}{2^M}$$

**Step 3 — the consistent expert survives.** By assumption at least one expert is consistent, and a consistent expert is never removed. Hence

$$1 \leq |C_{T+1}|$$

**Step 4 — combine.**

$$1 \leq \dfrac{n}{2^M} \implies 2^M \leq n \implies M \leq \log_2 n \qquad \blacksquare$$

**The one-line summary if you are short of time:** every mistake removes at least half the surviving experts, and at least one expert always survives, so there can be at most $\log_2 n$ halvings.

## Check yourself
1. Why does a mistake remove at least half the consistent experts? :: The prediction is a majority vote, so a wrong prediction means at least half of them voted wrongly, and all wrong voters are then discarded.
2. Which assumption gives the lower bound $1 \leq |C_{T+1}|$? :: That one expert is consistent, and consistent experts are never removed.
3. Complete the final step from $1 \leq n/2^M$. :: Rearranging gives $2^M \leq n$, so $M \leq \log_2 n$.

@@ id=m7-weighted-majority | title=The weighted majority algorithm | kind=formula | topic=MAT700 · L7 Experts | key | tags=exam,algorithm,core | cards=mat700-rebuild-l7
**When none of the experts is consistent**, halving fails. The **Multiplicative Weights (MW)** method is the fix — *a simple idea repeatedly discovered in Machine Learning, Optimization and Game Theory.*

**The setting — Prediction from Expert Advice.** Predict a stock's daily up/down movement. **If our prediction is wrong we lose a dollar that day; if correct, we lose nothing.** The stock movements can be **arbitrary and even adversarial**. To balance that pessimism we may watch the predictions of $n$ experts, who **could be arbitrarily correlated and may or may not know what they are talking about**.

> The algorithm's goal is to **limit its cumulative losses to roughly the same as the best of these experts.** At first sight this seems impossible, since **it is not known until the end of the sequence who the best expert was**, whereas the algorithm must predict all along.

**Why plain majority fails:** *a majority of experts may be consistently wrong on every single day.*

> **Weighted majority algorithm**
>
> **Initialization:** Fix an $\eta \leq \frac{1}{2}$. With each expert $i$, associate the weight $w_i^{(1)} := 1$.
>
> For $t = 1,2,\dots$:
> 1. **Make the prediction that is the weighted majority** of the experts' predictions based on the weights $w_1^{(t)},\dots,w_n^{(t)}$ — predict "up" or "down" depending on which has a **higher total weight** of experts advising it, breaking ties arbitrarily.
> 2. **For every expert $i$ who predicts wrongly, decrease his weight** for the next round by multiplying by $(1-\eta)$:
> $$w_i^{(t+1)} = (1-\eta)w_i^{(t)}$$

## Check yourself
1. What is the initial weight of each expert? :: 1.
2. What happens to the weight of an expert who predicts wrongly? :: It is multiplied by $(1-\eta)$.
3. Why does plain (unweighted) majority not work? :: A majority of the experts could be consistently wrong every day, so following them is consistently wrong too.
4. What is the constraint on $\eta$? :: $\eta \leq 1/2$.

@@ id=m7-weighted-majority-bound | title=The weighted majority mistake bound | kind=formula | topic=MAT700 · L7 Experts | key | tags=exam,proof,formula | cards=mat700-template-d
> **Theorem.** After $T$ steps, let $m_i^{(T)}$ be the number of mistakes of expert $i$ and $M^{(T)}$ the number of mistakes of our algorithm. Then for **every** $i$:
> $$M^{(T)} \leq 2(1+\eta)m_i^{(T)} + \dfrac{2\ln n}{\eta}$$

**In particular this holds for the best expert** — the one with the least $m_i^{(T)}$.

**Interpretation.** When $m_i^{(T)} \gg \frac{2}{\eta}\ln n$, the number of mistakes made by the algorithm is bounded by roughly $2(1+\eta)m_i^{(T)}$ — **approximately twice the number of mistakes made by the best expert.** This factor of 2 **is tight for any deterministic algorithm**. However, **it can be removed** by replacing the deterministic algorithm with a **randomized** one that predicts according to the majority opinion **with probability proportional to its weight**.

**Proof sketch — the potential function argument.**

1. A simple induction gives $w_i^{(t+1)} = (1-\eta)^{m_i^{(t)}}$.
2. Define the **potential function** $\Phi^{(t)} = \sum_i w_i^{(t)}$, so $\Phi^{(1)} = n$.
3. **Each time we make a mistake, the weighted majority of experts also made a mistake**, so at least half the total weight decreases by a factor $(1-\eta)$:
$$\Phi^{(t+1)} \leq \Phi^{(t)}\left(\dfrac{1}{2} + \dfrac{1}{2}(1-\eta)\right) = \Phi^{(t)}\left(1 - \dfrac{\eta}{2}\right)$$
4. Induction gives $\Phi^{(T+1)} \leq n(1-\eta/2)^{M^{(T)}}$.
5. Since $\Phi^{(T+1)} \geq w_i^{(T+1)}$ for every $i$, compare the two expressions and take logarithms, using $\ln(1-x) \leq -x$ for $x \geq 0$ and $-\ln(1-x) \leq x + x^2$ for $x < 1/2$.

**The structure is the same as the halving proof:** an upper bound on the potential that shrinks with every mistake, against a lower bound from the surviving good expert.

## Check yourself
1. State the bound. :: $M^{(T)} \leq 2(1+\eta)m_i^{(T)} + 2\ln(n)/\eta$ for every expert $i$, in particular the best one.
2. Roughly how many mistakes does the algorithm make compared with the best expert? :: About twice as many, once the best expert's mistake count is large relative to $2\ln(n)/\eta$.
3. How can the factor of 2 be removed? :: By randomising — predicting each opinion with probability proportional to its total weight.
4. What is the potential function, and what is its initial value? :: The sum of all expert weights; it starts at $n$.

@@ id=m7-proof-drill | title=The eight proofs, one page | kind=cheatsheet | topic=MAT700 · Proof drill | key | tags=exam,recall,proof | cards=mat700-template-b
Every proof the two papers have asked for, compressed to its idea. If you can expand each line into a full argument, the proof marks are secured.

| Proof | The one-line idea |
| --- | --- |
| **Edit distance is a metric** | Symmetry: reverse the script, swapping insertions and deletions. Triangle: concatenate an $x\rightarrow z$ script with a $z \rightarrow y$ script; the minimum is at most this particular route. |
| **Jaccard distance is a metric** | $d = 1 - SIM$; triangle via minhash — $d(x,y) = P(h(x)\neq h(y))$, and disagreement implies disagreement with $z$ on one side, then union bound. |
| **$F \leq (p+r)/2$** | Cross-multiply; reduces to $(p-r)^2 \geq 0$. |
| **Bag Jaccard $\leq 1/2$** | $\min(b,c) \leq (b+c)/2$ summed over all elements. |
| **Halving makes $\leq \log_2 n$ mistakes** | Each mistake halves $\|C_t\|$; the consistent expert keeps $\|C_{T+1}\| \geq 1$; so $2^M \leq n$. |
| **$\sum_v \deg(v) = 2\|E\|$** | Double-count vertex–edge incidences: once per vertex-degree, twice per edge. |
| **Minhash collision $=$ Jaccard** | Ignore Type Z rows; the first X-or-Y row decides, and $P = \|X\|/(\|X\|+\|Y\|)$. |
| **k-means converges** | Both steps weakly decrease $E$; $E \geq 0$ and there are finitely many assignments. |
| **Pages with no in-links share PageRank** | Their row of $M$ is zero, so $v_i = (1-\beta)/n$ regardless of $i$. |

**Structural habits that earn marks in any of them:**

1. **State what you are proving** before you start.
2. For metric proofs, **number the four axioms** and do them in order — do not merge them.
3. For axiom 2, prove **both directions**.
4. **End with $\blacksquare$ or "as required"** — it signals you know you have finished.
5. If you use a lecture result (e.g. the minhash theorem), **name it**.

@@ id=m7-calculation-drill | title=The seven calculations, one page | kind=cheatsheet | topic=MAT700 · Calculation drill | key | tags=exam,recall,calculation | cards=mat700-paper-a
Every numeric task the papers have set, with its method and its trap.

| Calculation | Method | The trap |
| --- | --- | --- |
| **Birthday triples** | $\binom{K}{3}/N^2$ with $N = 365$ | using $1/N^3$; forgetting to interpret it via Bonferroni |
| **TF–IDF numeric** | $IDF = \log_2(N/n_i)$; $TF = f_{ij}/\max_k f_{kj}$ | forgetting the **max** in the TF denominator |
| **TF–IDF bound** | $TF \leq 1$, $IDF \leq \log_2 N$ | not justifying $n_i \geq 1$ |
| **Jaccard, sets** | $\|S\cap T\| / \|S \cup T\|$ | union is **not** $\|S\|+\|T\|$ for sets |
| **Jaccard, bags** | $\sum\min / \sum(b+c)$ | union **is** the sum of sizes for bags — the opposite rule |
| **PageRank** | $v' = (1-\beta)e/n + \beta Mv$ | building $M$ transposed; forgetting to fix dead ends first |
| **kNN / weighted kNN** | distances → sort → vote, or sum $1/d^2$ | not declaring a tie and its tie-break |
| **Naive Bayes** | $\prod_k P(x_k\|C_i) \times P(C_i)$, compare | a zero count needing the pseudo-count fix |
| **Precision/recall/F** | build the 2×2 table first | reading $FP$ off the wrong row |
| **SVM margin** | $2/\|\mathbf{w}\|$ | including the constant $b$ in the norm |

**The universal habit: build the small table first.** Every one of these questions is quick once the counts are laid out, and almost every lost mark comes from computing before tabulating.

@@ id=m7-svm-margin | title=SVM: margin and support vectors | kind=formula | topic=MAT700 · Beyond the lectures | key | tags=exam,gap,svm
**Flagged as a gap:** the 2023 paper asks this [3 + 3 marks] but **it does not appear in Lectures 1–7 or in the three tutorials**. Treat this note as the minimum safe answer and chase the source if you can.

**The three terms** [2023, 3 marks]:

* **Linearly separable data** — there exists a hyperplane $\mathbf{w}^T\mathbf{x} + b = 0$ placing all points of one class strictly on one side and all of the other class on the other.
* **Margin** — the width of the gap between the two classes, measured perpendicular to the separating hyperplane; the distance between the two parallel supporting hyperplanes.
* **Support vectors** — the training points lying **on** those supporting hyperplanes, i.e. closest to the decision boundary. They alone determine $\mathbf{w}$; removing any other point leaves the solution unchanged.

**The margin formula.** With the standard normalisation that support vectors satisfy $|\mathbf{w}^T\mathbf{x} + b| = 1$:

$$\text{margin} = \dfrac{2}{\|\mathbf{w}\|}$$

**The 2023 calculation.** For the optimal decision plane $x_1 - 2x_2 + 12x_3 - 33 = 0$:

$$\mathbf{w} = (1, -2, 12), \qquad \|\mathbf{w}\| = \sqrt{1 + 4 + 144} = \sqrt{149}$$

$$\text{margin} = \dfrac{2}{\sqrt{149}} \approx 0.164$$

**The trap:** $b = -33$ **does not enter the norm.** The margin depends only on the coefficient vector; the constant shifts the plane's position, not the width of the gap.

**Multiclass reduction** [2023, 4 marks] — reducing one multiclass problem to several binary ones:

* **One-vs-rest (one-vs-all):** train $K$ classifiers, the $k$th separating class $k$ from all others; predict the class whose classifier gives the highest score.
* **One-vs-one:** train $\binom{K}{2}$ classifiers, one per pair; predict by majority vote over the pairwise outcomes.

## Check yourself
1. Give the margin formula and compute it for $x_1 - 2x_2 + 12x_3 - 33 = 0$. :: $2/\|\mathbf{w}\|$ with $\mathbf{w}=(1,-2,12)$, so $2/\sqrt{149} \approx 0.164$.
2. Does the constant term affect the margin? :: No — only $\|\mathbf{w}\|$ does; $b$ shifts the plane without changing the gap width.
3. Name the two multiclass reductions and their classifier counts. :: One-vs-rest with $K$ classifiers, and one-vs-one with $\binom{K}{2}$.

@@ id=m7-graph-laplacian | title=Graph Laplacian and harmonic functions | kind=concept | topic=MAT700 · Beyond the lectures | key | tags=exam,gap,graphs
**Flagged as a gap:** the 2023 paper asks for these [2 + 3 marks] but **neither appears in Lectures 1–7 or the tutorials I have**. This is the standard treatment; verify against any supplementary material before relying on it.

**Unnormalized graph Laplacian.** For a weighted graph with weighted adjacency matrix $W$ (entries $w_{ij}$), define the **degree matrix** $D$ as the diagonal matrix with

$$d_i = \sum_{j} w_{ij}$$

Then the **unnormalized graph Laplacian** is

$$L = D - W$$

**Key properties**, any of which may earn the marks:

* $L$ is **symmetric** and **positive semi-definite**;
* for any vector $f$, the **quadratic form** is
$$f^T L f = \dfrac{1}{2}\sum_{i,j} w_{ij}(f_i - f_j)^2 \geq 0$$
* the **smallest eigenvalue is 0**, with the constant vector $\mathbf{1}$ as eigenvector, since each row of $L$ sums to zero;
* the **multiplicity of the eigenvalue 0 equals the number of connected components**.

That quadratic form is the reason $L$ appears in data mining at all: it **measures how much a labelling varies across edges**, so minimising it makes connected points take similar values.

**Harmonic function.** Given a weighted graph with some **labelled** vertices $V_L$ (values fixed) and the rest unlabelled $V_U$, a function $f$ on the vertices is **harmonic** if:

1. it **agrees with the labels** on $V_L$: $f(v) = y_v$ for $v \in V_L$; and
2. at every **unlabelled** vertex it equals the **weighted average of its neighbours**:
$$f(v) = \dfrac{1}{d_v}\sum_{u \sim v} w_{uv}f(u) \qquad \text{for all } v \in V_U$$

Equivalently $(Lf)(v) = 0$ on all unlabelled vertices — which is where the Laplacian and harmonic functions meet, and why the pair is asked in one question.

## Check yourself
1. Define the unnormalized graph Laplacian. :: $L = D - W$, where $D$ is the diagonal degree matrix with $d_i = \sum_j w_{ij}$ and $W$ is the weighted adjacency matrix.
2. Give the quadratic form of $L$ and say what it measures. :: $f^TLf = \frac{1}{2}\sum_{i,j}w_{ij}(f_i-f_j)^2$; it measures how much $f$ varies across edges.
3. What does the multiplicity of eigenvalue 0 tell you? :: The number of connected components of the graph.
4. Define a harmonic function. :: One that matches the given labels on labelled vertices and equals the weighted average of its neighbours at every unlabelled vertex, i.e. $Lf = 0$ there.

@@ id=m7-syllabus-gaps | title=What the papers ask that the lectures do not cover | kind=traps | topic=MAT700 · Beyond the lectures | key | tags=exam,gap,strategy
**An honest audit.** I extracted all seven lecture PDFs, the Lecture 1 supplement, and the tutorial material. Three topics appear in the **2023 paper** with no corresponding lecture content:

| Topic | 2023 marks | Status |
| --- | ---: | --- |
| SVM: linearly separable, margin, support vectors, margin calculation | 6 | **Not in Lectures 1–7** |
| Reducing multiclass to multiple binary problems | 4 | **Not in Lectures 1–7** |
| Unnormalized graph Laplacian; harmonic functions | 5 | **Not in Lectures 1–7** |

Lecture 2 lists **support vector machines** among the algorithms of the course, so SVM was evidently intended; it simply is not developed in the material I can see.

**What to do about it:**

1. **Check for material I do not have** — a Lecture 8, an additional handout, or the online-class recordings. The Transcripts folder holds five recordings that I have not mined; the missing content may be delivered verbally there.
2. **These are all in Question 4 of the 2023 paper.** You answer **three of four**. If this material stays unavailable, Q4 is the question to drop — but that is a real constraint on your choices, not a comfortable one, so confirm before relying on it.
3. The two notes I have written on these topics give the **standard treatments**, which are almost certainly what is wanted. But they are **reconstructed, not sourced from your module**, and I have marked them as such.

**The reverse check.** Everything else in both papers maps cleanly onto Lectures 1–7, so the rest of these notes are grounded in your actual materials.

## Check yourself
1. Which three examined topics are missing from the lectures? :: SVM margin/support vectors, multiclass-to-binary reduction, and the graph Laplacian with harmonic functions.
2. Where might the missing content be? :: Possibly in the five online-class recordings in the Transcripts folder, or in a handout not present in the Lectures folder.
3. Why is dropping Question 4 a risky plan? :: You only get to omit one question of four, so it removes all slack if another question turns out to be hard.
