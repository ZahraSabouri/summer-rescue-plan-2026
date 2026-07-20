@@ id=m7-jaccard-sets | title=Jaccard similarity of sets | kind=formula | topic=MAT700 · L3 Similarity | key | tags=exam,formula,definition | cards=mat700-template-a
> **Definition (Jaccard Similarity).** The Jaccard similarity of sets $S$ and $T$ is
> $$SIM(S,T) = \dfrac{|S \cap T|}{|S \cup T|}$$
> the ratio of the size of the intersection to the size of the union.

The lecture's picture: three elements in the intersection, eight elements in $S \cup T$, so $SIM(S,T) = 3/8$.

**The 2024 calculation** [2 marks]: Jaccard similarity of $\{2,3,5,7,11,13\}$ and $\{1,3,5,7,9,11,13,15\}$.

* Intersection: $\{3,5,7,11,13\}$ — **5 elements**
* Union: $\{1,2,3,5,7,9,11,13,15\}$ — **9 elements**
* $SIM = \dfrac{5}{9}$

**Method warning.** The union is **not** $|S| + |T|$ — that double-counts the intersection. For sets, $|S \cup T| = |S| + |T| - |S \cap T| = 6 + 8 - 5 = 9$. ✓ (For *bags* the union genuinely is the sum — see the bags note, and do not mix the two rules up.)

**Applications** given: finding **textually similar documents** (plagiarism, mirror pages, articles from the same source) and **collaborative filtering** — recommending items liked by users with similar tastes. Two Amazon customers are similar if their sets of purchased items have high Jaccard similarity. **Jaccard similarities need not be very high to be significant.**

## Check yourself
1. Define Jaccard similarity. :: The size of the intersection divided by the size of the union.
2. Compute $SIM(\{1,2,3\}, \{2,3,4,5\})$. :: Intersection $\{2,3\}$ has 2 elements; union $\{1,2,3,4,5\}$ has 5; so $2/5$.
3. Why is $|S \cup T| \neq |S| + |T|$ for sets? :: Elements in both would be counted twice; you must subtract the intersection.

@@ id=m7-jaccard-bags | title=Jaccard similarity for bags | kind=formula | topic=MAT700 · L3 Similarity | key | tags=exam,formula,calculation | cards=mat700-template-a
> **Definition (The Jaccard Similarity for Bags).** The Jaccard similarity for bags $B$ and $C$ is defined by counting an element **$n$ times in the intersection if $n$ is the minimum of the number of times the element appears in $B$ and $C$**. In the union, we count the element **the sum of the number of times it appears in $B$ and in $C$**.

$$SIM(B,C) = \dfrac{\sum_x \min(b_x, c_x)}{\sum_x (b_x + c_x)}$$

**The size of the union of two bags is always the sum of the sizes of the two bags.** That is the key structural fact — and the reason for the $\leq 1/2$ bound.

**The lecture's example.** $\{a,a,a,b\}$ and $\{a,a,b,b,c\}$: intersection counts $a$ twice and $b$ once, size 3; union has size $4 + 5 = 9$; so the bag similarity is $3/9 = 1/3$.

**The 2024 calculation** [2 marks]:
$B = \{1,2,2,3,3,3,4,4,4,4,5,5,5,5,5\}$ and $C = \{5,4,4,3,3,3,2,2,2,2,1,1,1,1,1\}$.

| Element | in $B$ | in $C$ | $\min$ |
| --- | ---: | ---: | ---: |
| 1 | 1 | 5 | 1 |
| 2 | 2 | 4 | 2 |
| 3 | 3 | 3 | 3 |
| 4 | 4 | 2 | 2 |
| 5 | 5 | 1 | 1 |
| | **15** | **15** | **9** |

$$SIM(B,C) = \dfrac{9}{15+15} = \dfrac{9}{30} = \dfrac{3}{10}$$

**Where bags come from.** Ratings: if ratings are 1-to-5 stars, put a movie in a customer's bag $n$ times if they rated it $n$ stars, then use bag similarity to compare customers.

## Check yourself
1. How is the intersection of two bags counted? :: Each element appears the minimum of its counts in the two bags.
2. How is the union counted? :: Each element appears the sum of its counts — so the union size is always the sum of the two bag sizes.
3. Compute the bag similarity of $\{a,a,b\}$ and $\{a,b,b,b\}$. :: Min counts: $a \rightarrow 1$, $b \rightarrow 1$, total 2. Union $= 3 + 4 = 7$. So $2/7$.

@@ id=m7-jaccard-bags-bound | title=Proof: bag Jaccard similarity is at most 1/2 | kind=formula | topic=MAT700 · L3 Similarity | key | tags=exam,proof | cards=mat700-template-b
The 2024 paper [4 marks]: *"Prove that the Jaccard similarity of bags is always less than or equal to 1/2."*

**Proof.** Let $b_x$ and $c_x$ be the number of times element $x$ appears in bags $B$ and $C$.

By definition,

$$SIM(B,C) = \dfrac{\sum_x \min(b_x,c_x)}{\sum_x (b_x + c_x)}$$

For any two non-negative reals, $\min(b,c) \leq \dfrac{b+c}{2}$ — the minimum is at most the average. Summing this over all $x$:

$$\sum_x \min(b_x,c_x) \leq \sum_x \dfrac{b_x + c_x}{2} = \dfrac{1}{2}\sum_x (b_x + c_x)$$

Dividing both sides by $\sum_x(b_x + c_x)$, which is positive for non-empty bags:

$$SIM(B,C) \leq \dfrac{1}{2} \qquad \blacksquare$$

**When is the bound attained?** Equality in $\min(b,c) \leq (b+c)/2$ requires $b = c$, so $SIM(B,C) = 1/2$ **exactly when the two bags are identical**. This is the important contrast with sets: a set has $SIM(S,S) = 1$, but a bag has $SIM(B,B) = 1/2$, because the union double-counts everything.

## Check yourself
1. What single inequality drives the proof? :: $\min(b,c) \leq (b+c)/2$.
2. What is the bag similarity of a bag with itself, and why is it not 1? :: Exactly $1/2$ — the intersection counts each element once but the union counts it twice, since bag union sums the counts.

@@ id=m7-shingling | title=Shingling of documents | kind=concept | topic=MAT700 · L3 Similarity | key | tags=exam,definition,text-mining | cards=mat700-rebuild-l3
> **Definition ($k$-Shingles).** A document is a string of characters. Define a **$k$-shingle** for a document to be **any substring of length $k$ found within the document**. We associate with each document the **set** of $k$-shingles that appear one or more times within it.

**The lecture's example.** $D = $ `abcdabd`, $k = 2$. The set of 2-shingles is $\{ab, bc, cd, da, bd\}$. **Note `ab` appears twice within $D$ but appears only once as a shingle** — it is a set, not a bag.

**Why shingling works:** documents that share pieces **as short as sentences or even phrases** will have many common elements in their shingle sets, **even if those sentences appear in different orders** in the two documents. Character-by-character comparison cannot detect that; shingling turns it into a set-intersection problem.

**Choosing $k$** — the rule to quote:

> $k$ should be picked **large enough that the probability of any given shingle appearing in any given document is low.**

If $k$ is too small, most sequences of $k$ characters appear in most documents and every pair looks similar.

**The worked estimate.** For emails, suppose only letters and one white-space character appear: $27^5 = 14{,}348{,}907$ possible 5-shingles. A typical email is far shorter than 14 million characters, so $k = 5$ works — and indeed it does.

**But the calculation is subtle.** More than 27 characters appear in emails, yet characters are **not equally probable** — common letters and blanks dominate while "z" is rare. So even short emails share many 5-shingles of common letters. **A good rule of thumb is to imagine there are only 20 characters and estimate the number of $k$-shingles as $20^k$.** For large documents such as research articles, **$k = 9$ is considered safe**.

**White space:** it probably makes sense to replace any sequence of one or more white-space characters by a single blank.

## Check yourself
1. Define a $k$-shingle. :: Any substring of length $k$ occurring in the document; a document maps to the set of its $k$-shingles.
2. Give the 2-shingles of `abcdabd`. :: $\{ab, bc, cd, da, bd\}$ — five, because `ab` occurs twice but counts once.
3. What is the rule for choosing $k$? :: Large enough that any given shingle is unlikely to appear in any given document.
4. Why is $27^k$ an over-estimate of the effective shingle space? :: Characters are not equiprobable; common letters and blanks dominate, so the rule of thumb $20^k$ is used instead.
5. What $k$ is considered safe for research articles? :: 9.

@@ id=m7-minhash | title=Minhashing | kind=concept | topic=MAT700 · L3 Similarity | key | tags=exam,definition | cards=mat700-rebuild-l3
**The problem.** Sets of shingles are large. With millions of documents it may be impossible to store all shingle-sets in main memory — and even if they fit, **the number of pairs may be too great to evaluate the similarity of each pair**. The goal is to replace large sets by much smaller **signatures**, such that **we can compare the signatures of two sets and estimate the Jaccard similarity of the underlying sets from the signatures alone**.

**Characteristic matrix.** Columns correspond to the **sets**, rows to **elements of the universal set**. There is a 1 in row $r$, column $c$ if the element for row $r$ is a member of the set for column $c$; otherwise 0.

> **Definition (Minhash).** To minhash a set represented by a column of the characteristic matrix, **pick a permutation of the rows**. The **minhash value of any column is the number of the first row, in the permuted order, in which the column has a 1**.

**The lecture's example.** Universal set $\{a,b,c,d,e\}$ with $S_1 = \{a,d\}$, $S_2 = \{c\}$, $S_3 = \{b,d,e\}$, $S_4 = \{a,c,d\}$. Picking the row order **beadc** gives $h(S_1)=a$, $h(S_2)=c$, $h(S_3)=b$, $h(S_4)=a$.

**Minhash signatures.** Pick at random some number $n$ of permutations of the rows — **perhaps 100 or several hundred**. Call the resulting functions $h_1, \dots, h_n$. The **signature** for set $S$ is the vector $[h_1(S), h_2(S), \dots, h_n(S)]$. Replacing each column of $M$ with its signature gives the **signature matrix**: **the same number of columns as $M$ but only $n$ rows.**

## Check yourself
1. Define the minhash of a column. :: Under a chosen row permutation, the number of the first row in which that column has a 1.
2. What are the two problems signatures solve? :: Shingle sets are too large to hold in memory, and there are too many pairs to compare directly.
3. What are the dimensions of the signature matrix relative to the characteristic matrix? :: Same number of columns, but only $n$ rows where $n$ is the number of permutations.

@@ id=m7-minhash-theorem | title=Proof: minhash collision probability equals Jaccard similarity | kind=formula | topic=MAT700 · L3 Similarity | key | tags=exam,proof,core | cards=mat700-template-b
The theorem that makes minhashing work.

> **Theorem.** The probability that the minhash function for a **random permutation of rows** produces the **same value for two sets** equals the **Jaccard similarity** of those sets.

**Proof.** Restrict attention to the two columns for sets $S_1$ and $S_2$. Every row falls into exactly one of three classes:

| Class | Pattern | Count |
| --- | --- | --- |
| **Type X** | 1 in **both** columns | $\|X\|$ |
| **Type Y** | 1 in **one** column, 0 in the other | $\|Y\|$ |
| **Type Z** | 0 in **both** columns | $\|Z\|$ |

Type Z rows are in neither set, so they affect neither the intersection nor the union:

$$SIM(S_1,S_2) = \dfrac{|S_1 \cap S_2|}{|S_1 \cup S_2|} = \dfrac{|X|}{|X| + |Y|}$$

Now consider a random permutation and scan rows from the top. Ignore Type Z rows — they contribute a 1 to neither column, so they cannot determine either minhash. Look at the **first row that is of Type X or Type Y**:

* if it is **Type X**, both columns have their first 1 in that row, so $h(S_1) = h(S_2)$;
* if it is **Type Y**, exactly one column has a 1 there, so that column's minhash is this row and the other's is some later row — hence $h(S_1) \neq h(S_2)$.

Under a random permutation each of the $|X| + |Y|$ non-Z rows is equally likely to be the first one encountered, so

$$P(h(S_1) = h(S_2)) = \dfrac{|X|}{|X| + |Y|} = SIM(S_1,S_2) \qquad \blacksquare$$

**Why this matters practically:** each of the $n$ permutations is an independent Bernoulli trial with success probability $SIM$, so **the fraction of signature rows where two columns agree is an unbiased estimate of their Jaccard similarity** — computed from $n$ numbers instead of two huge sets.

## Check yourself
1. What are the three row types, and which is irrelevant? :: X (1 in both), Y (1 in one), Z (0 in both). Type Z is irrelevant — it affects neither intersection nor union nor the minhash.
2. Why does the first non-Z row decide the question? :: If it is Type X both minhashes equal it; if Type Y only one column has a 1 there, so the minhashes differ.
3. How is the similarity estimated in practice from signatures? :: By the fraction of the $n$ signature rows on which the two columns agree.

@@ id=m7-distance-axioms | title=The four distance axioms | kind=formula | topic=MAT700 · L4 Distances | key | tags=exam,definition,core | cards=mat700-template-b
Every "prove this is a distance measure" question is answered by checking these four. **Memorise them in order.**

> **Definition (Distance Measure).** Suppose we have a set of points, called a **space**. A distance measure on this space is a function $d(x,y)$ that takes two points and produces a real number, satisfying:
>
> 1. $d(x,y) \geq 0$ — **no negative distances**
> 2. $d(x,y) = 0$ **if and only if** $x = y$ — distances are positive except from a point to itself
> 3. $d(x,y) = d(y,x)$ — **symmetry**
> 4. $d(x,y) \leq d(x,z) + d(z,y)$ — **the triangle inequality**

**Marking note.** Axiom 2 is an *if and only if* — both directions are needed, and dropping one is the commonest lost mark. Axiom 4 is almost always the hardest and carries the most credit.

**The distances in the module:**

| Name | Definition |
| --- | --- |
| **Euclidean / $L_2$** | $d(x,y) = \sqrt{\sum_{i=1}^{n}(x_i - y_i)^2}$ |
| **$L_r$-norm** ($r \geq 1$) | $d(x,y) = \left(\sum_{i=1}^{n}\|x_i - y_i\|^r\right)^{1/r}$ |
| **$L_1$** | **Manhattan distance** |
| **$L_\infty$** | the **maximum** of $\|x_i - y_i\|$ over all dimensions |
| **Jaccard distance** | $d(x,y) = 1 - SIM(x,y)$ |
| **Cosine distance** | the **angle** between the vectors to the two points; a vector and its multiples are not distinguished |
| **Edit distance** | for strings: the **smallest number of insertions and deletions of single characters** converting $x$ to $y$ |
| **Hamming distance** | the **number of components in which two vectors differ** |

## Check yourself
1. State the four axioms. :: Non-negativity; $d(x,y)=0$ iff $x=y$; symmetry; the triangle inequality.
2. Which axiom is an "if and only if", and why does it matter? :: The second — you must prove both that identical points have distance 0 and that distance 0 forces the points to be identical.
3. What is $L_\infty$? :: The maximum absolute coordinate difference over all dimensions.
4. Why does cosine distance not distinguish a vector from its multiples? :: It measures only the angle between them, which is zero for parallel vectors.

@@ id=m7-edit-distance-proof | title=Proof: edit distance is a distance measure | kind=formula | topic=MAT700 · L4 Distances | key | tags=exam,proof,core | cards=mat700-template-b
Asked in **both** papers (3–4 marks). Work the four axioms in order.

**Definition.** The edit distance between strings $x = x_1\dots x_n$ and $y = y_1 \dots y_m$ is the **smallest number of insertions and deletions of single characters that will convert $x$ to $y$**.

**The lecture's example.** $x = $ `abcde`, $y = $ `acfdeg` gives $d(x,y) = 3$: delete `b`, insert `f` after `c`, insert `g` after `e`. No sequence of fewer than three operations works.

**Proof.**

**(1) Non-negativity.** $d(x,y)$ is a count of operations, so it is a non-negative integer. ✓

**(2) $d(x,y) = 0 \iff x = y$.**
*($\Leftarrow$)* If $x = y$, the empty sequence of operations converts $x$ to $y$, so $d(x,y) = 0$.
*($\Rightarrow$)* If $d(x,y) = 0$, no operations are applied, so $x$ is left unchanged and equals $y$. ✓

**(3) Symmetry.** Every edit script converting $x$ to $y$ can be **reversed**: run the operations backwards, replacing each insertion by the deletion of that character and each deletion by the insertion of that character. The reversed script converts $y$ to $x$ and has the **same length**. Hence any script for $x \rightarrow y$ gives one of equal length for $y \rightarrow x$ and conversely, so the minima are equal: $d(x,y) = d(y,x)$. ✓

**(4) Triangle inequality.** Let $S_1$ be a minimal script converting $x \rightarrow z$, of length $d(x,z)$, and $S_2$ a minimal script converting $z \rightarrow y$, of length $d(z,y)$. **Concatenating** $S_1$ then $S_2$ converts $x \rightarrow y$ using $d(x,z) + d(z,y)$ operations. This is *some* valid script from $x$ to $y$, and $d(x,y)$ is the length of a **minimal** one, so

$$d(x,y) \leq d(x,z) + d(z,y) \qquad \blacksquare$$

**The idea in one sentence, if you are short of time:** going via $z$ is one particular way of getting from $x$ to $y$, and the minimum over all ways is at most any particular way.

## Check yourself
1. How is symmetry proved? :: Reverse the edit script, swapping insertions and deletions; it has the same length, so the minima in both directions coincide.
2. How is the triangle inequality proved? :: Concatenating a minimal $x \rightarrow z$ script with a minimal $z \rightarrow y$ script gives a valid $x \rightarrow y$ script of length $d(x,z)+d(z,y)$; the minimum can only be shorter.
3. What must you show for axiom 2, in both directions? :: Identical strings need no operations so distance 0; and zero operations leave the string unchanged, so distance 0 forces equality.

@@ id=m7-jaccard-distance-proof | title=Proof: Jaccard distance is a distance measure | kind=formula | topic=MAT700 · L4 Distances | key | tags=exam,proof | cards=mat700-template-b
Asked in 2024 [4 marks]. **Jaccard distance** is $d(x,y) = 1 - SIM(x,y)$, where $SIM$ is Jaccard similarity.

**Proof.**

**(1) Non-negativity.** $SIM(x,y) = \dfrac{|x \cap y|}{|x \cup y|}$, and since $x \cap y \subseteq x \cup y$ we have $0 \leq SIM \leq 1$. Hence $d = 1 - SIM \geq 0$. ✓

**(2) $d(x,y) = 0 \iff x = y$.**
$d(x,y) = 0 \iff SIM(x,y) = 1 \iff |x \cap y| = |x \cup y|$. Since $x \cap y \subseteq x \cup y$, equal finite sizes force $x \cap y = x \cup y$, which holds **iff** $x = y$. ✓

**(3) Symmetry.** Both $\cap$ and $\cup$ are commutative, so $SIM(x,y) = SIM(y,x)$ and hence $d(x,y) = d(y,x)$. ✓

**(4) Triangle inequality.** The clean route is the **minhash theorem**. For a random permutation $h$,

$$P(h(x) \neq h(y)) = 1 - SIM(x,y) = d(x,y)$$

Now for any fixed permutation $h$, if $h(x) \neq h(y)$ then $h(x) \neq h(z)$ or $h(z) \neq h(y)$ — because if both were equal, $h(x) = h(z) = h(y)$, a contradiction. So the event $\{h(x) \neq h(y)\}$ is contained in the union $\{h(x) \neq h(z)\} \cup \{h(z) \neq h(y)\}$. Taking probabilities and using the union bound:

$$d(x,y) = P(h(x) \neq h(y)) \leq P(h(x) \neq h(z)) + P(h(z) \neq h(y)) = d(x,z) + d(z,y) \qquad \blacksquare$$

**If you have not been given the minhash theorem in the question**, say you are using it and cite it — it is a lecture result, so this is legitimate and much shorter than a direct set-counting argument.

## Check yourself
1. Why is $0 \leq SIM \leq 1$ for sets? :: The intersection is a subset of the union, so the ratio of their sizes lies between 0 and 1.
2. What is the elegant proof of the triangle inequality? :: Write $d$ as the probability that a random minhash disagrees; disagreement between $x$ and $y$ implies disagreement with any $z$ on at least one side, then apply the union bound.
3. Why does $SIM(x,y)=1$ force $x=y$? :: It makes the intersection and union equal in size; since one contains the other, they are the same set, which happens only when $x = y$.

@@ id=m7-knn-definition | title=kNN classification | kind=concept | topic=MAT700 · L4 kNN | key | tags=exam,definition,algorithm | cards=mat700-rebuild-l4
> **Definition (Basic $k$-Nearest Neighbour Classification Algorithm).**
> - Find the $k$ training instances that are **closest** to the unseen instance.
> - Take the **most commonly occurring classification** for these $k$ instances.

The idea: **estimate the classification of an unseen instance using the classification of the instance or instances that are closest to it.** Nearest neighbour methods are **lazy learners** — nothing is built at training time.

**Key issues affecting performance:**

* **The choice of $k$.** An estimate of the best value can be obtained by **cross-validation**.
* **How to combine the class labels.** The simplest method is a **majority vote**. A more sophisticated approach, **usually much less sensitive to the choice of $k$**, weights each object's vote **by its distance**.

**The weight the lecture gives:**

$$w_i = \dfrac{1}{d(y,z)^2}$$

the **reciprocal of the squared distance**. Other choices are possible (e.g. $1/d$), so **state which weighting you are using** in an exam answer.

## Check yourself
1. State the two steps of basic kNN. :: Find the $k$ closest training instances; take their most common class.
2. How is a good $k$ chosen? :: By cross-validation.
3. What is the standard weight in weighted kNN? :: The reciprocal of the squared distance, $1/d^2$.
4. Why is weighted kNN less sensitive to $k$? :: Distant neighbours contribute progressively less, so adding more of them changes the outcome little.

@@ id=m7-knn-worked | title=kNN worked: the 2024 one-dimensional dataset | kind=formula | topic=MAT700 · L4 kNN | key | tags=exam,calculation | cards=mat700-template-b
The 2024 paper gives this table and asks for **2-NN and 3-NN by majority vote**, then **weighted kNN** [4 + 4 marks].

| $x$ | 1 | 4 | 9 | 16 | 25 | 36 | 49 | 64 | 81 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $y$ | + | + | − | − | − | **?** | + | − | + |

**Classify $x = 36$.**

**Step 1 — distances.** In one dimension, $d = |x - 36|$:

| $x$ | 1 | 4 | 9 | 16 | 25 | 49 | 64 | 81 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $d$ | 35 | 32 | 27 | 20 | **11** | **13** | 28 | 45 |
| $y$ | + | + | − | − | **−** | **+** | − | + |

**Step 2 — 2-NN.** The two nearest are $x=25$ ($d=11$, class −) and $x=49$ ($d=13$, class +). **The vote is tied, 1–1.** Say so explicitly and state your tie-breaking rule — the nearest neighbour is $x = 25$, so break towards **−**. *Naming the tie is worth marks; silently picking one is not.*

**Step 3 — 3-NN.** Add the next nearest, $x = 16$ ($d = 20$, class −). Votes: **− , + , −** → majority **−**.

**Step 4 — weighted kNN**, using $w_i = 1/d_i^2$. For $k = 3$:

| $x$ | $d$ | class | $w = 1/d^2$ |
| --- | ---: | :---: | ---: |
| 25 | 11 | − | $1/121 \approx 0.00826$ |
| 49 | 13 | + | $1/169 \approx 0.00592$ |
| 16 | 20 | − | $1/400 = 0.00250$ |

* Weight for **−**: $0.00826 + 0.00250 = 0.01076$
* Weight for **+**: $0.00592$

**Class −** wins. Note the weighting also **resolves the $k=2$ tie**: $0.00826 > 0.00592$, so **−** there too.

**Method checklist.** Compute all distances → sort → take the $k$ smallest → vote (or sum weights per class) → **state ties and your tie-break**.

## Check yourself
1. What are the two nearest neighbours of $x=36$ and their distances? :: $x=25$ at distance 11 and $x=49$ at distance 13.
2. What should you do when the vote ties? :: Say that it ties, state a tie-breaking rule (e.g. favour the nearer neighbour), and apply it — the weighted version resolves it naturally.
3. Why does weighted kNN give − at $k=2$? :: $x=25$ is closer, so its weight $1/121$ exceeds $x=49$'s $1/169$.

@@ id=m7-precision-recall | title=Precision, recall and F-measure | kind=formula | topic=MAT700 · L4 Evaluation | key | tags=exam,formula,core | cards=mat700-template-d
Asked in **both** papers. Define, calculate, and prove the bound.

With TP, FP, TN, FN the counts of true/false positives and negatives:

$$\text{Precision } p = \dfrac{TP}{TP + FP} \qquad \text{Recall } r = \dfrac{TP}{TP + FN}$$

$$F = \dfrac{2pr}{p+r}$$

**Precision** — of everything the classifier called positive, what fraction really is. **Recall** — of everything that really is positive, what fraction was found.

**Why they are needed: the skewed-class trap**, which Lecture 4 makes with a cancer example:

> Train a model. You get 1% error on the test set — 99% correct diagnoses. But **only 0.5% of patients have cancer**. Predicting $y = 0$ always gives 0.5% error, i.e. **99.5% accuracy** — better than your model, while detecting nothing.

**Use precision/recall when $y = 1$ is a rare class that we want to detect.**

**The 2023 calculation** [6 marks]: 500 emails, 100 spam and 400 non-spam. 90 spam correctly classified as spam; 300 non-spam correctly classified as not spam.

* $TP = 90$, $FN = 100 - 90 = 10$, $TN = 300$, $FP = 400 - 300 = 100$
* $p = \dfrac{90}{90+100} = \dfrac{90}{190} = \dfrac{9}{19} \approx 0.474$
* $r = \dfrac{90}{90+10} = \dfrac{90}{100} = 0.9$
* $F = \dfrac{2 \times 0.474 \times 0.9}{0.474 + 0.9} = \dfrac{0.853}{1.374} \approx 0.621$

**The trap in this calculation:** $FP = 100$ comes from the *non-spam* row (400 total, 300 correct), not from the spam row. Build the full 2×2 table before computing anything.

## Check yourself
1. Give the three formulas. :: $p = TP/(TP+FP)$, $r = TP/(TP+FN)$, $F = 2pr/(p+r)$.
2. In the spam example, why is $FP = 100$? :: Of 400 genuine non-spam messages only 300 were classified correctly, so 100 non-spam were wrongly called spam.
3. State the skewed-class trap in one sentence. :: When the positive class is rare, always predicting the majority achieves very high accuracy while detecting nothing, so accuracy is uninformative.

@@ id=m7-f-measure-proof | title=Proof: F-measure is at most the mean of precision and recall | kind=formula | topic=MAT700 · L4 Evaluation | key | tags=exam,proof,core | cards=mat700-template-d
Asked in **both** papers [4 marks]: *"Prove that the F-measure of any binary classifier is $\leq \dfrac{p+r}{2}$."*

**Proof.** We must show

$$\dfrac{2pr}{p+r} \leq \dfrac{p+r}{2}$$

Since $p, r \geq 0$ and (for the F-measure to be defined) $p + r > 0$, we may multiply both sides by the positive quantity $2(p+r)$ without reversing the inequality:

$$4pr \leq (p+r)^2$$

Expanding the right-hand side:

$$4pr \leq p^2 + 2pr + r^2$$

$$0 \leq p^2 - 2pr + r^2 = (p-r)^2$$

which is true, since a square of a real number is non-negative. Every step is reversible, so the original inequality holds. ∎

**Equality holds exactly when $p = r$.**

**What it means.** $F$ is the **harmonic mean** of $p$ and $r$ (up to the factor of 2), and this is the standard fact that **the harmonic mean is at most the arithmetic mean**. The consequence is the reason F-measure is used at all: a classifier cannot get a good $F$ by making one of $p, r$ large while the other is small — the harmonic mean is dragged down by the smaller value, whereas the arithmetic mean is not.

## Check yourself
1. What does the inequality reduce to? :: $(p-r)^2 \geq 0$.
2. When is the bound tight? :: Exactly when precision equals recall.
3. What is the conceptual point? :: $F$ is a harmonic mean, which is always at most the arithmetic mean and is dominated by the smaller of the two values — so both must be good.

@@ id=m7-generalization-error | title=Generalization error and overfitting | kind=concept | topic=MAT700 · L4 Evaluation | tags=exam,definition | cards=mat700-rebuild-l4
The misclassification rate **on the training set** is not what we care about.

> What we care about is **generalization error**, which is the **expected value of the misclassification rate when averaged over future data**. This can be approximated by computing the misclassification rate on a **large independent test set, not used during model training**.

**Overfitting.** When we fit highly flexible models we must avoid **trying to model every minor variation in the input, since this is more likely to be noise than true signal**. A high-degree polynomial gives a very "wiggly" curve; it is unlikely the true function has such extreme oscillations.

**The kNN illustration.** When $K = 1$ the method makes **no errors on the training set** — it just returns the labels of the original training points — **but the resulting prediction surface is very "wiggly"**, so it may not predict future data well.

**Typical split** given in the lecture:

| Portion | Use |
| --- | --- |
| **60%** | training examples |
| **20%** | cross-validation examples |
| **20%** | test examples |

## Check yourself
1. Define generalization error. :: The expected misclassification rate averaged over future data, approximated on a large independent test set.
2. Why does 1-NN achieve zero training error, and why is that not good news? :: Each training point is its own nearest neighbour, so its label is returned exactly; the decision surface is highly irregular and generalises poorly.
3. What three-way split does the lecture give? :: 60% training, 20% cross-validation, 20% test.

@@ id=m7-bayes-theorem | title=Bayes' theorem and Bayesian classifiers | kind=concept | topic=MAT700 · L4 Naive Bayes | key | tags=exam,definition,formula | cards=mat700-template-c
> **Bayesian classifiers are statistical classifiers.** They can predict **class membership probabilities** — the probability that a given tuple belongs to a particular class.

Let $X$ be a data tuple (the "evidence") and $H$ the hypothesis that $X$ belongs to class $C$. We want $P(H|X)$, the probability the hypothesis holds given the observed tuple.

**Bayes' Theorem**

$$P(H|X) = \dfrac{P(X|H)P(H)}{P(X)}$$

> **Naive Bayesian classifiers assume that the effect of an attribute value on a given class is independent of the values of the other attributes. This assumption is called class-conditional independence.**

Naming that assumption — **class-conditional independence** — is usually worth a mark on its own, as is noting that it is what makes the method *naive*.

## Check yourself
1. State Bayes' theorem. :: $P(H|X) = P(X|H)P(H)/P(X)$.
2. What assumption makes Naive Bayes "naive", and what is it called? :: That attribute values are independent of one another given the class — class-conditional independence.

@@ id=m7-naive-bayes-method | title=Naive Bayes: the method | kind=formula | topic=MAT700 · L4 Naive Bayes | key | tags=exam,algorithm,core | cards=mat700-template-c
The five steps, as Lecture 4 numbers them.

**1.** Let $D$ be a training set of tuples with class labels; each tuple is an $n$-dimensional vector $X = (x_1,\dots,x_n)$ over attributes $A_1,\dots,A_n$.

**2.** With $m$ classes $C_1,\dots,C_m$, the classifier predicts that $X$ belongs to the class with the **highest posterior probability**: $X \in C_i$ iff $P(C_i|X) > P(C_j|X)$ for all $j \neq i$.

**3.** By Bayes' theorem $P(C_i|X) = \dfrac{P(X|C_i)P(C_i)}{P(X)}$. **As $P(X) is constant for all classes, only $P(X|C_i)P(C_i)$ needs to be maximized.**

**4. Class priors.** If unknown, assume classes equally likely and maximise $P(X|C_i)$ alone. Otherwise estimate

$$P(C_i) = \dfrac{|C_{i,D}|}{|D|}$$

**5. The naive assumption.** To reduce computation:

$$P(X|C_i) = \prod_{k=1}^{n} P(x_k|C_i) = P(x_1|C_i) \times P(x_2|C_i) \times \dots \times P(x_n|C_i)$$

**Estimating each factor.** If $A_k$ is **categorical**, $P(x_k|C_i)$ is the number of tuples of class $C_i$ having value $x_k$ for $A_k$, divided by $|C_{i,D}|$.

**If the count is zero**, use the **pseudo-count** method:

$$P(x_j|C_i) = \dfrac{n(x_j) + 1}{n_i + m_j}, \qquad m_j = |dom(A_j)|$$

where $m_j$ is the **number of distinct values the attribute can take**. If $A_k$ is continuous-valued, parameter estimates are needed instead.

**Why the pseudo-count exists:** without it, a single zero factor makes the entire product zero, so one unseen attribute value vetoes a class no matter how well everything else fits.

## Check yourself
1. Why can $P(X)$ be ignored? :: It is the same for every class, so it does not affect which class maximises the posterior.
2. Write the naive factorisation. :: $P(X|C_i) = \prod_{k=1}^{n} P(x_k|C_i)$.
3. Give the pseudo-count formula and say what $m_j$ is. :: $P(x_j|C_i) = (n(x_j)+1)/(n_i+m_j)$, where $m_j$ is the number of distinct values in the attribute's domain.
4. What goes wrong without pseudo-counts? :: A zero conditional probability makes the whole product zero, so one unseen value rules out a class entirely.

@@ id=m7-naive-bayes-worked | title=Naive Bayes worked: the weather example | kind=formula | topic=MAT700 · L4 Naive Bayes | key | tags=exam,calculation | cards=mat700-template-c
The 2024 paper gives the classic weather table — attributes **outlook, temperature, humidity, windy**, class **play** — and asks how Naive Bayes classifies $X = (\text{sunny}, \text{cool}, \text{high}, \text{true})$ [5 marks].

**The method, laid out so you can apply it to whatever table appears:**

**Step 1 — priors.** Count the class column. On the standard 14-row weather set: $P(\text{yes}) = 9/14$, $P(\text{no}) = 5/14$.

**Step 2 — conditional probabilities**, one per attribute value per class. For the standard table:

| | $P(\cdot \mid \text{yes})$ | $P(\cdot \mid \text{no})$ |
| --- | --- | --- |
| outlook = sunny | 2/9 | 3/5 |
| temperature = cool | 3/9 | 1/5 |
| humidity = high | 3/9 | 4/5 |
| windy = true | 3/9 | 3/5 |

**Step 3 — multiply, including the prior:**

$$P(X|\text{yes})P(\text{yes}) = \dfrac{2}{9}\times\dfrac{3}{9}\times\dfrac{3}{9}\times\dfrac{3}{9}\times\dfrac{9}{14} \approx 0.0053$$

$$P(X|\text{no})P(\text{no}) = \dfrac{3}{5}\times\dfrac{1}{5}\times\dfrac{4}{5}\times\dfrac{3}{5}\times\dfrac{5}{14} \approx 0.0206$$

**Step 4 — compare.** $0.0206 > 0.0053$, so the classifier predicts **play = no**.

**Marks-protecting habits:**

* **Read the counts off the table in the paper**, not from memory — the table may differ from the standard one.
* **Show the two products**, not just the winner.
* **Do not normalise** unless asked; comparing the two unnormalised scores is sufficient and the lecture says so explicitly.
* **Watch for a zero count** — if any conditional probability is 0, apply the pseudo-count correction and say that you are doing so.

## Check yourself
1. What four numbers do you multiply for each class? :: The four conditional probabilities of the observed attribute values given that class, and then the class prior.
2. Do you need $P(X)$? :: No — it is the same for both classes, so the unnormalised products can be compared directly.
3. What do you do if one conditional probability comes out zero? :: Apply the pseudo-count (Laplace) correction $(n(x_j)+1)/(n_i+m_j)$ and state that you have done so.
