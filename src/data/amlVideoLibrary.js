// Verified Applied ML video catalogue.
//
// Every entry below was resolved from the source playlist itself (yt-dlp, July 2026)
// or from the course's own site — not guessed from a lecture number. That matters:
// the CS229 link in the original study plan is the Autumn 2018 series, but the
// lecture TITLES quoted in that plan came from the 2008 series, which numbers its
// lectures differently (2008 L7 "Optimal Margin Classifier" is 2018 L6 "Support
// Vector Machines"). Mapping by number would have pointed at the wrong lectures.
// Everything here is mapped by topic against the verified 2018 titles.
//
// Each video is a SEPARATE resource so that "studied" progress belongs to one
// specific video and cannot leak across unrelated cards. The 6h52m full-course
// video is split into timestamped segments for the same reason — its section
// boundaries were derived from the video's own transcript, since its YouTube
// chapters stop at 52:00.
//
// Out of scope and deliberately absent: the course video after 5:45:00 (neural
// networks, clustering, PCA) and UBC sections 14-18 (clustering, NLP, PCA, word
// embeddings, attention/RNN). Those are CMT307 Part 2 / group-project material and
// the class test covers Sessions 1-5 only.

const UBC_PLAYLIST = 'PLHofvQE1VlGtZoAULxcHb7lOsMved0CuM'
const CS229_PLAYLIST = 'PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU'
const CS156_PLAYLIST = 'PLD63A284B7615313A'
const COURSE_VIDEO = 'dh1lvdp0oCo'

function ubc(id, videoId, title, minutes, session) {
  return {
    id: `aml-video-ubc-${id}`,
    videoId,
    title: `UBC ${title}`,
    shortTitle: title,
    source: 'UBC Applied ML (Varada Kolhatkar)',
    url: `https://www.youtube.com/watch?v=${videoId}&list=${UBC_PLAYLIST}`,
    minutes,
    session,
  }
}

function cs229(lecture, videoId, title, minutes, session) {
  return {
    id: `aml-video-cs229-l${String(lecture).padStart(2, '0')}`,
    videoId,
    title: `CS229 L${lecture} — ${title}`,
    shortTitle: title,
    source: 'Stanford CS229 (Andrew Ng, Autumn 2018)',
    url: `https://www.youtube.com/watch?v=${videoId}&list=${CS229_PLAYLIST}`,
    minutes,
    session,
    depth: 'deep',
  }
}

function cs156(lecture, videoId, title, minutes, session) {
  return {
    id: `aml-video-cs156-l${String(lecture).padStart(2, '0')}`,
    videoId,
    title: `CS156 L${String(lecture).padStart(2, '0')} — ${title}`,
    shortTitle: title,
    source: 'Caltech CS156 (Abu-Mostafa)',
    url: `https://www.youtube.com/watch?v=${videoId}&list=${CS156_PLAYLIST}`,
    minutes,
    session,
    depth: 'deep',
  }
}

// start/end in seconds; boundaries derived from the transcript keyword-density pass.
function segment(id, start, end, title, session) {
  const minutes = Math.round((end - start) / 60)
  return {
    id: `aml-video-course-${id}`,
    videoId: COURSE_VIDEO,
    title: `Applied ML in Python — ${title}`,
    shortTitle: title,
    source: 'Applied ML in Python Complete Course',
    url: `https://www.youtube.com/watch?v=${COURSE_VIDEO}&t=${start}s`,
    start,
    end,
    minutes,
    session,
    segmentLabel: `${formatClock(start)}–${formatClock(end)}`,
  }
}

function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

export const AML_VIDEOS = [
  // ---- Session 1: ML overview, terminology, workflow ----
  ubc('1-0-ml-introduction', '-1hTcS5ZE4w', '1.0 Machine Learning Introduction', 16, 's1'),
  ubc('2-1-ml-terminology', 'YNT8n4cXu4A', '2.1 Machine Learning Terminology', 11, 's1'),
  ubc('2-2-baselines', '6eT5cLL-2Vc', '2.2 Baselines', 14, 's1'),
  ubc('2-4-more-terminology', 'KEtsfXn4w2E', '2.4 More Terminology', 16, 's1'),
  segment('s1-workflow', 150, 3060, 'workflow, sklearn setup & first model', 's1'),

  // ---- Session 2: preprocessing ----
  ubc('5-1-preprocessing-intro', 'xx9HlmzORRk', '5.1 Data Preprocessing Introduction', 11, 's2'),
  ubc('5-2-imputation-scaling', 'G2IXbVzKlt8', '5.2 Imputation and Scaling', 18, 's2'),
  ubc('5-3-sklearn-pipelines', 'nWTce7WJSd4', '5.3 Introduction to Scikit-Learn Pipelines', 12, 's2'),
  ubc('5-4-one-hot-encoding', '2mJ9rAhMMl0', '5.4 One-Hot Encoding', 9, 's2'),
  ubc('6-1-column-transformer', 'to2mukSyvLk', '6.1 Scikit-Learn ColumnTransformer', 20, 's2'),
  ubc('6-2-encoding-text', 'hteVvLwrWZ4', '6.2 Encoding Text Features', 17, 's2'),

  // ---- Session 3: regression, generalisation, evaluation ----
  ubc('3-1-generalization', 'iS2hsRRlc2M', '3.1 Generalization', 13, 's3'),
  ubc('3-2-data-splitting', 'h2AEobwcUQw', '3.2 Data Splitting', 17, 's3'),
  ubc('3-3-cross-validation', '4cv8VYonepA', '3.3 Cross-Validation', 11, 's3'),
  ubc('3-4-fundamental-tradeoff', 'Ihay8yE5KTI', '3.4 The Fundamental Tradeoff of ML', 20, 's3'),
  ubc('7-1-linear-regression', 'HXd1U2q4VFA', '7.1 Linear Regression', 15, 's3'),
  segment('s3-linear-regression', 7200, 8100, 'least-squares linear regression', 's3'),
  segment('s3-ridge-lasso', 8100, 9300, 'ridge, lasso, regularisation & scaling', 's3'),
  segment('s3-overfitting', 4500, 7200, 'overfitting, underfitting & model complexity', 's3'),
  segment('s3-cross-validation', 12540, 13200, 'cross-validation', 's3'),
  cs156(3, 'FIbVs5GbBlQ', 'The Linear Model I', 80, 's3'),
  cs156(4, 'L_0efNkdGMc', 'Error and Noise', 76, 's3'),
  cs156(5, 'SEYAnnLazMU', 'Training versus Testing', 79, 's3'),
  cs156(8, 'zrEyxfl2-a8', 'Bias-Variance Tradeoff', 78, 's3'),
  cs156(11, 'EQWr3GGCdzw', 'Overfitting', 76, 's3'),
  cs156(12, 'I-VfYXzC5ro', 'Regularization', 78, 's3'),
  cs156(13, 'o7zzaKd0Lkk', 'Validation', 76, 's3'),
  cs229(2, '4b4MUYve_U8', 'Linear Regression & Gradient Descent', 78, 's3'),
  cs229(8, 'rjbkWSTjHzM', 'Data Splits, Models & Cross-Validation', 83, 's3'),

  // ---- Session 4: classification, SVM, trees, tuning ----
  ubc('2-3-decision-trees', 'Hcf19Ij35rA', '2.3 Decision Trees', 13, 's4'),
  ubc('4-1-analogy-based', 'hCa3EXEUmQk', '4.1 Analogy-based Algorithms Introduction', 16, 's4'),
  ubc('4-2-knn', 'bENDqXKJLmg', '4.2 k-Nearest Neighbours', 13, 's4'),
  ubc('4-3-knn-continued', 'IRGbqi5S9gQ', '4.3 kNNs continued', 8, 's4'),
  ubc('4-4-svm-rbf', 'ic_zqOhi020', '4.4 Support Vector Machine with RBF Kernel', 11, 's4'),
  ubc('7-2-logistic-regression', '56L5z_t22qE', '7.2 Logistic Regression', 17, 's4'),
  ubc('7-3-probability-scores', '_OAK5KiGLg0', '7.3 Predicting Probability Scores', 11, 's4'),
  ubc('8-1-hyperparameter-opt', 'lMWdHZSZMk8', '8.1 Hyperparameter Optimization Motivation', 13, 's4'),
  ubc('8-2-validation-overfitting', 'Z9a9XZ0vQv0', '8.2 Overfitting of the validation error', 13, 's4'),
  ubc('9-1-metrics-motivation', '-Mt39caHq0M', '9.1 Classification Metrics Motivation', 8, 's4'),
  ubc('9-2-confusion-matrix', 'ZCuCErW5lI8', '9.2 Confusion Matrix', 6, 's4'),
  ubc('9-3-precision-recall-f1', 'XkCTUuoH23c', '9.3 Precision, Recall, F1 score', 11, 's4'),
  ubc('9-4-class-imbalance', 'jHaKRCFb6Qw', '9.4 Addressing Class Imbalance', 15, 's4'),
  segment('s4-knn', 3060, 3900, 'k-nearest neighbours classification', 's4'),
  segment('s4-logistic', 9300, 10200, 'logistic regression', 's4'),
  segment('s4-svm-kernels', 10500, 12600, 'linear & kernel SVM, C and gamma', 's4'),
  segment('s4-decision-trees', 13200, 14400, 'decision trees & feature importance', 's4'),
  segment('s4-evaluation', 14400, 19200, 'confusion matrix, precision/recall, ROC & imbalance', 's4'),
  cs156(14, 'eHsErlPJWUU', 'Support Vector Machines', 78, 's4'),
  cs156(15, 'XUj5JbQihlU', 'Kernel Methods', 76, 's4'),
  cs229(3, 'het9HFqo1TQ', 'Locally Weighted & Logistic Regression', 80, 's4'),
  cs229(4, 'iZTeva0WSTQ', 'Perceptron & Generalized Linear Model', 82, 's4'),
  cs229(6, 'lDwow4aOrtg', 'Support Vector Machines', 81, 's4'),
  cs229(7, '8NYoQiRANpg', 'Kernels', 80, 's4'),

  // ---- Session 5: ensembles ----
  ubc('11-1-ensembles-motivation', '8litm1H7DLo', '11.1 Ensembles: Motivation', 7, 's5'),
  ubc('11-2-gradient-boosted-trees', 'EkFkY9QB2Hw', '11.2 Intro to Gradient Boosted Tree Models', 11, 's5'),
  ubc('12-1-interpretation-motivation', 'xfICsGL7DXE', '12.1 Model Interpretation Motivation', 7, 's5'),
  ubc('12-2-feature-importances', 'tiSN18OmZOo', '12.2 Feature Importances Non-Linear Models', 9, 's5'),
  segment('s5-ensembles', 19500, 20700, 'random forests & gradient boosting', 's5'),
  cs229(9, 'wr9gUr-eWdA', 'Decision Trees and Ensemble Methods', 81, 's5'),
]

export const AML_VIDEO_BY_ID = new Map(AML_VIDEOS.map((video) => [video.id, video]))

export function amlVideo(id) {
  const video = AML_VIDEO_BY_ID.get(id)
  if (!video) throw new Error(`Unknown AML video id: ${id}`)
  return video
}
