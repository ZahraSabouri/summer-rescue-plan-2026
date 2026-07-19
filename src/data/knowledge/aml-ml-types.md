Within the currently provided CMT307 materials, the main taxonomy is:

```text
Artificial Intelligence
└── Machine Learning
    ├── Supervised learning — labelled data
    │   ├── Classification — categorical target
    │   └── Regression — continuous target
    │
    ├── Unsupervised learning — unlabelled data
    │   ├── Clustering
    │   └── Anomaly detection
    │
    └── Reinforcement learning — feedback/reward from an environment

Deep Learning
└── A subset/family within machine learning, not a separate supervision type
```

## 1. Master table

| Learning paradigm | Training information available | Target $y$ | Main purpose | Principal tasks | Output | Course examples | Methods named in the materials |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Supervised learning** | Inputs and their correct outputs: labelled examples $(X, y)$ | Provided during training | Learn a relationship $y = f(X)$ that generalises to unseen data | Classification and regression | Predicted class or predicted numerical value | Labelled malware examples; tumour diagnosis; banknote authentication; Bitcoin price prediction | Linear regression, polynomial regression, logistic regression, SVM, k-NN, decision trees, neural networks, ensemble learning |
| **Supervised classification** | Labelled examples | **Categorical** | Assign an observation to a class | Binary or multi-category classification | Class label | Benign vs malignant tumour; genuine vs forged banknote; apple, orange or lemon | Logistic regression, SVM, k-NN, decision trees, ensemble methods; some neural-network models |
| **Supervised regression** | Labelled examples | **Continuous** | Predict a numerical quantity | Linear and nonlinear numerical prediction | Number | Bitcoin price prediction | Linear, polynomial, ridge, LASSO, elastic net; neural networks; some SVM, k-NN and decision-tree models |
| **Unsupervised learning** | Inputs $X$, but no supplied target labels | Not provided | Discover patterns or structure in the data | Clustering and anomaly detection | Groups, structure or unusual observations | Discovering user groups based on shared interests | K-means is given as a clustering example |
| **Unsupervised clustering** | Unlabelled observations | None | Divide similar observations into groups | Clustering | Cluster assignments | Grouping banknotes or social-network users without supplied classes | K-means |
| **Unsupervised anomaly detection** | Usually unlabelled observations | None | Identify observations that differ strongly from the normal pattern | Anomaly detection | Identification of unusual observations | Listed in the Session 3 recap | Not specified in the current recap slides |
| **Reinforcement learning** | Interaction with an environment: states, actions and rewards | No predetermined correct output for every individual action | Learn which actions help achieve a long-term goal | Sequential decision-making | A learned action strategy | Game playing; learning chess through wins and losses; reducing traffic delays | No particular RL algorithm is covered in the current introductory material |

## 2. What "labelled" and "unlabelled" mean

These words describe the **dataset**, while supervised and unsupervised describe the **learning approach**.

### Labelled data

Each training observation has $(\mathbf{x}_i, y_i)$, where $\mathbf{x}_i$ is the input feature vector and $y_i$ is the known correct target, class, label or ground truth.

| Variance | Skewness | Entropy | Label |
| ---: | ---: | ---: | --- |
| 0.017 | 8.693 | -3.967 | Genuine |
| -1.397 | 3.319 | -1.995 | Forged |

Because the correct class is provided, this can be used for **supervised classification**.

### Unlabelled data

Each observation contains only its input features $\mathbf{x}_i$.

| Variance | Skewness | Entropy |
| ---: | ---: | ---: |
| 0.017 | 8.693 | -3.967 |
| -1.397 | 3.319 | -1.995 |

There is no genuine/forged column. The system must discover patterns itself, such as possible clusters.

### Reward-based feedback

Reinforcement learning receives neither a conventional label for every observation nor a complete list of correct actions. Instead, an agent:

1. observes a state;
2. takes an action;
3. receives a reward and a new state;
4. gradually learns which actions help achieve the goal.

A win/loss signal tells a game-playing system whether the final result was good, but it does not necessarily tell the system the correct move at every earlier step.

## 3. Supervised learning in detail

Supervised learning means learning from a **labelled training dataset**. The central distinction is the type of target:

| Question about the target | Task |
| --- | --- |
| Is $y$ a category or class? | **Classification** |
| Is $y$ a continuous numerical quantity? | **Regression** |

### Classification

Classification learns $f(\mathbf{x}) \rightarrow \text{class}$. Examples: genuine or forged; benign or malignant; apple, orange or lemon; customer buys or does not buy.

The Session 4 definition describes classification as finding a model that predicts the class attribute from the other attributes. Its goal is to assign previously unseen records to classes as accurately as possible.

| Variation | Meaning | Example |
| --- | --- | --- |
| **Binary classification** | Two possible classes | Genuine/forged |
| **Multiple-category classification** | More than two possible classes | Apple/orange/lemon |

### Regression

Regression learns $f(\mathbf{x}) \rightarrow \text{continuous number}$: price, temperature, energy consumption, income, height.

| Method | Basic description |
| --- | --- |
| Linear regression | Predicts the target using a linear relationship |
| Polynomial regression | Adds polynomial terms to model curved relationships |
| Ridge regression | Linear regression with regularisation |
| LASSO | Regularised regression that can reduce some coefficients to zero |
| Elastic net | Combines Ridge- and LASSO-style regularisation |
| Neural networks | Can model more complicated input-output relationships |

## 4. Unsupervised learning in detail

### Clustering

> Which observations appear naturally similar?

It produces groups without being told the correct group names in advance.

```text
Unlabelled customer data
        ↓
Clustering algorithm
        ↓
Cluster 1: occasional customers
Cluster 2: regular customers
Cluster 3: high-value customers
```

These meanings may be interpreted *after* the algorithm creates the groups; they were not supplied as labels during training.

### Anomaly detection

> Which observations appear inconsistent with the normal pattern?

Possible examples include unusual transactions, abnormal sensor readings, unusual network activity, and observations far from the main data distribution.

The Session 3 recap places anomaly detection under unsupervised learning. Detailed anomaly-detection algorithms have not yet been provided.

## 5. Reinforcement learning in detail

```text
                    action
Agent  ------------------------------>  Environment
       <------------------------------
             reward and new state
```

| Element | Meaning |
| --- | --- |
| **Agent** | The learner or decision-maker |
| **Environment** | The system with which the agent interacts |
| **State** | Information describing the current situation |
| **Action** | A decision made by the agent |
| **Reward** | Feedback indicating how useful the result was |
| **Goal** | Achieve high reward over the interaction |

The key distinction is that reinforcement learning is concerned with **sequences of decisions**. An action can influence later states and later rewards.

## 6. Categories that are often confused

| Term | What it actually describes | Example |
| --- | --- | --- |
| **Labelled/unlabelled** | A property of the available training data | Whether a `Revenue` target column is present |
| **Supervised/unsupervised/reinforcement** | The learning paradigm | Learning from targets, discovering structure, or learning from rewards |
| **Classification/regression** | The prediction task | Predicting a category versus a continuous number |
| **Clustering/anomaly detection** | Unsupervised tasks | Finding groups or unusual observations |
| **Decision tree, SVM, k-NN** | Algorithms/model families | Different mechanisms for learning predictions |
| **Linear or logistic regression** | Specific model types | Numerical prediction or categorical prediction |
| **Neural network/deep learning** | Model family | Can be trained for different tasks |
| **Ensemble learning** | Combining multiple models | Bagging, boosting or stacking |
| **Preprocessing** | A stage in the ML workflow | Scaling, encoding, imputing missing values |
| **Training/test split** | Experimental design | Training on one subset and evaluating on unseen data |
| **Tabular, text, image, time series** | Data representation or format | A dataset may be tabular regardless of its learning paradigm |

### Critical point

An algorithm is not always permanently attached to one task. The course notes explicitly state that several methods can be used for **both** classification and regression: k-nearest neighbours, support vector machines, decision trees, and neural networks.

The **problem and target type** determine whether you are performing classification or regression, not merely the name of the algorithm.

## 7. Deep learning is not a fourth supervision category

The materials present the relationship as $\text{Deep Learning} \subset \text{Machine Learning} \subset \text{Artificial Intelligence}$.

Deep learning refers primarily to learning with multi-layer neural-network models. It can be used in different paradigms:

| Deep-learning application | Learning task |
| --- | --- |
| Classifying an image as cat or dog | Supervised classification |
| Predicting energy consumption | Supervised regression |
| Learning a compressed representation using an autoencoder | Potentially unsupervised representation learning |
| Choosing actions in a game | Reinforcement learning with neural networks |

## 8. Quick decision guide

```text
Do I have a known target y for each training example?
│
├── Yes → Supervised learning
│         │
│         ├── Is y categorical?
│         │      └── Classification
│         │
│         └── Is y continuous?
│                └── Regression
│
└── No
    │
    ├── Am I trying to discover groups or unusual patterns?
    │      └── Unsupervised learning
    │             ├── Groups → Clustering
    │             └── Unusual cases → Anomaly detection
    │
    └── Is an agent taking actions and receiving rewards?
           └── Reinforcement learning
```

## 9. Applying this to the Lab 1 shopper dataset

The card refers to the `Revenue` target. The identification process is:

1. There is a target column, so the data is **labelled**.
2. `Revenue` represents categories such as purchase/no purchase rather than a continuous quantity.
3. Therefore, the problem is **supervised classification**.
4. Because the target has two outcomes, it is a two-class classification problem.
5. Class balance must be inspected because one class may occur much more frequently than the other.

> Do not infer class balance from intuition; calculate it from the loaded dataset.

## 10. What is not currently in the provided material

I can't find the following learning paradigms in the provided module materials yet:

* semi-supervised learning;
* self-supervised learning;
* active learning;
* transfer learning as a separate taxonomy category;
* online versus batch learning.

They may be useful broader ML concepts, but they should not be treated as part of the currently supported CMT307 taxonomy unless later materials introduce them.

## Check yourself

1. A dataset contains customer information and a known `Revenue=True/False` target. What paradigm and task is this? :: Supervised learning, and specifically binary classification — the target is present (so labelled) and categorical (so not regression).
2. A dataset contains customer behaviour but no target, and you want to find natural customer groups. What task is this? :: Unsupervised clustering. No target column is supplied, and the goal is to group similar observations.
3. Why is deep learning not placed alongside supervised, unsupervised and reinforcement learning? :: Because it describes a model family (multi-layer neural networks), not a supervision setting. Deep models can be trained in any of the three paradigms.
4. Can a decision tree be used only for classification? :: No. Decision trees, k-NN, SVM and neural networks can all do both classification and regression. The target type decides the task, not the algorithm name.
5. Why is logistic regression classified as a classification method despite containing the word "regression"? :: Because its output is a class probability used to assign a categorical label. The name is historical; the target is categorical, so the task is classification.

## Sources

* `Session1-Overview of Machine Learning.pdf`, p.15.
* `Session1-Overview of Machine Learning.pdf`, pp.26–29.
* `Session3-Regression, Generalisation & Model evaluation.pdf`, pp.3–4.
* `Session4_Classification.pdf`, p.3.
