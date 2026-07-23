// Course-first, exam-aligned Applied ML video catalogue.
//
// The CMT307 source plan ranks the Applied Machine Learning in Python Complete
// Course above the short playlists. Its exam-relevant Part 1 is therefore kept
// as timestamped sections across S1, S3, S4 and S5 cards. Short UBC clips are
// retained only where they add prerequisite vocabulary, module-specific
// preprocessing mechanics, feature importance or a validation trap.
//
// The complete-course tail after 5:45 (neural networks, clustering and PCA) is
// Part 2 material and remains excluded from this Sessions 1-5 class-test plan.

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
    title: `Applied ML in Python - ${title}`,
    shortTitle: title,
    source: 'Applied Machine Learning in Python Complete Course',
    url: `https://www.youtube.com/watch?v=${COURSE_VIDEO}&t=${start}s`,
    start,
    end,
    minutes: Math.round((end - start) / 60),
    session,
    segmentLabel: `${formatClock(start)}-${formatClock(end)}`,
  }
}

export const AML_VIDEOS = [
  // S1: the complete-course workflow is the main teaching source; UBC supplies
  // concise vocabulary before it.
  ubc('1-0-ml-introduction', '-1hTcS5ZE4w', '1.0 Machine Learning Introduction', 16, 's1'),
  ubc('2-1-ml-terminology', 'YNT8n4cXu4A', '2.1 Machine Learning Terminology', 11, 's1'),
  segment('s1-workflow', 150, 3060, 'workflow, sklearn setup & first model', 's1'),

  // S2: the long course does not provide a self-contained missing-value /
  // categorical preprocessing block, so the coherent UBC 5.1-5.4 sequence and
  // the following ColumnTransformer lesson fill that course gap.
  ubc('5-1-preprocessing-intro', 'xx9HlmzORRk', '5.1 Data Preprocessing Introduction', 11, 's2'),
  ubc('5-2-imputation-scaling', 'G2IXbVzKlt8', '5.2 Imputation and Scaling', 18, 's2'),
  ubc('5-3-sklearn-pipelines', 'nWTce7WJSd4', '5.3 Introduction to Scikit-Learn Pipelines', 12, 's2'),
  ubc('5-4-one-hot-encoding', '2mJ9rAhMMl0', '5.4 One-Hot Encoding', 9, 's2'),
  ubc('6-1-column-transformer', 'to2mukSyvLk', '6.1 Scikit-Learn ColumnTransformer', 20, 's2'),

  // S3: all exam-relevant regression/generalisation sections of the complete
  // course, kept at their original timestamp boundaries.
  segment('s3-overfitting', 4500, 7200, 'overfitting, underfitting & model complexity', 's3'),
  segment('s3-linear-regression', 7200, 8100, 'least-squares linear regression', 's3'),
  segment('s3-ridge-lasso', 8100, 9300, 'ridge, lasso, regularisation & scaling', 's3'),
  segment('s3-cross-validation', 12540, 13200, 'cross-validation', 's3'),

  // S4: classifiers and model evaluation from the complete course. The long
  // evaluation section is assigned to the later dedicated metrics drill so the
  // initial concepts card remains possible within its live study block.
  segment('s4-knn', 3060, 4500, 'kNN fitting, scoring & model complexity', 's4'),
  segment('s4-logistic', 9300, 10500, 'logistic regression & linear classifiers', 's4'),
  segment('s4-svm-kernels', 10500, 12600, 'linear & kernel SVM, C and gamma', 's4'),
  segment('s4-decision-trees', 13200, 14400, 'decision trees & feature importance', 's4'),
  segment('s4-evaluation', 14400, 19200, 'confusion matrix, precision/recall, ROC & imbalance', 's4'),
  ubc('8-2-validation-overfitting', 'Z9a9XZ0vQv0', '8.2 Overfitting of the validation error', 13, 's4'),

  // S5: the final exam-relevant complete-course section plus a short,
  // complementary feature-importance explanation.
  segment('s5-ensembles', 19500, 20700, 'random forests & gradient boosting', 's5'),
  ubc('12-2-feature-importances', 'tiSN18OmZOo', '12.2 Feature Importances Non-Linear Models', 9, 's5'),
]

export const AML_VIDEO_BY_ID = new Map(AML_VIDEOS.map((video) => [video.id, video]))

export function amlVideo(id) {
  const video = AML_VIDEO_BY_ID.get(id)
  if (!video) throw new Error(`Unknown AML video id: ${id}`)
  return video
}
