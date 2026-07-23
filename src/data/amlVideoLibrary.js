// Minimal, exam-aligned Applied ML video catalogue.
//
// These are the only videos used by the live study sequences. They were
// resolved from the source playlist (July 2026), selected by topic against
// Sessions 1–5 and kept short enough to support the lab-first rescue plan.
// Long CS229/CS156 lectures, unused UBC topics and Part 2 material are omitted.

const UBC_PLAYLIST = 'PLHofvQE1VlGtZoAULxcHb7lOsMved0CuM'
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

function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function segment(id, start, end, title, session) {
  return {
    id: `aml-video-course-${id}`,
    videoId: COURSE_VIDEO,
    title: `Applied ML in Python — ${title}`,
    shortTitle: title,
    source: 'Applied ML in Python Complete Course',
    url: `https://www.youtube.com/watch?v=${COURSE_VIDEO}&t=${start}s`,
    start,
    end,
    minutes: Math.round((end - start) / 60),
    session,
    segmentLabel: `${formatClock(start)}–${formatClock(end)}`,
  }
}

export const AML_VIDEOS = [
  // S1: vocabulary plus one concise end-to-end example.
  ubc('1-0-ml-introduction', '-1hTcS5ZE4w', '1.0 Machine Learning Introduction', 16, 's1'),
  ubc('2-1-ml-terminology', 'YNT8n4cXu4A', '2.1 Machine Learning Terminology', 11, 's1'),
  segment('s1-workflow', 2091, 3118, 'example problem, data inspection & first model setup', 's1'),

  // S2: preprocessing choices and their leakage-safe implementation.
  ubc('5-1-preprocessing-intro', 'xx9HlmzORRk', '5.1 Data Preprocessing Introduction', 11, 's2'),
  ubc('5-2-imputation-scaling', 'G2IXbVzKlt8', '5.2 Imputation and Scaling', 18, 's2'),
  ubc('5-4-one-hot-encoding', '2mJ9rAhMMl0', '5.4 One-Hot Encoding', 9, 's2'),
  ubc('5-3-sklearn-pipelines', 'nWTce7WJSd4', '5.3 Introduction to Scikit-Learn Pipelines', 12, 's2'),
  ubc('6-1-column-transformer', 'to2mukSyvLk', '6.1 Scikit-Learn ColumnTransformer', 20, 's2'),

  // S3: regression, generalisation and honest model assessment.
  ubc('7-1-linear-regression', 'HXd1U2q4VFA', '7.1 Linear Regression', 15, 's3'),
  ubc('3-1-generalization', 'iS2hsRRlc2M', '3.1 Generalization', 13, 's3'),
  ubc('3-2-data-splitting', 'h2AEobwcUQw', '3.2 Data Splitting', 17, 's3'),
  ubc('3-3-cross-validation', '4cv8VYonepA', '3.3 Cross-Validation', 11, 's3'),

  // S4: the Lab 4 algorithms, tuning and exam-relevant metrics.
  ubc('4-4-svm-rbf', 'ic_zqOhi020', '4.4 Support Vector Machine with RBF Kernel', 11, 's4'),
  ubc('2-3-decision-trees', 'Hcf19Ij35rA', '2.3 Decision Trees', 13, 's4'),
  ubc('8-1-hyperparameter-opt', 'lMWdHZSZMk8', '8.1 Hyperparameter Optimization Motivation', 13, 's4'),
  ubc('9-1-metrics-motivation', '-Mt39caHq0M', '9.1 Classification Metrics Motivation', 8, 's4'),
  ubc('9-2-confusion-matrix', 'ZCuCErW5lI8', '9.2 Confusion Matrix', 6, 's4'),
  ubc('9-3-precision-recall-f1', 'XkCTUuoH23c', '9.3 Precision, Recall, F1 score', 11, 's4'),
  ubc('9-4-class-imbalance', 'jHaKRCFb6Qw', '9.4 Addressing Class Imbalance', 15, 's4'),
  ubc('8-2-validation-overfitting', 'Z9a9XZ0vQv0', '8.2 Overfitting of the validation error', 13, 's4'),

  // S5: ensembles plus interpretation needed for the comparison sheet.
  ubc('11-1-ensembles-motivation', '8litm1H7DLo', '11.1 Ensembles: Motivation', 7, 's5'),
  ubc('11-2-gradient-boosted-trees', 'EkFkY9QB2Hw', '11.2 Intro to Gradient Boosted Tree Models', 11, 's5'),
  ubc('12-1-interpretation-motivation', 'xfICsGL7DXE', '12.1 Model Interpretation Motivation', 7, 's5'),
  ubc('12-2-feature-importances', 'tiSN18OmZOo', '12.2 Feature Importances Non-Linear Models', 9, 's5'),
]

export const AML_VIDEO_BY_ID = new Map(AML_VIDEOS.map((video) => [video.id, video]))

export function amlVideo(id) {
  const video = AML_VIDEO_BY_ID.get(id)
  if (!video) throw new Error(`Unknown AML video id: ${id}`)
  return video
}
