import { fileType, moduleFileUrl, viewerFor } from '../utils/resourceLinks.js'
import { AML_VIDEOS } from './amlVideoLibrary.js'

const MODULE_FOLDERS = {
  aml: 'CMT307 Applied Machine Learning',
  timeSeries: 'MA4508 Time Series',
  mat700: 'MAT700 Mathematical Methods for Data Mining',
  teamProject: 'CMT501 Team Project',
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function local(moduleKey, group, title, path, options = {}) {
  return {
    id: options.id ?? `${moduleKey}-${slug(group)}-${slug(title)}`,
    moduleKey,
    group,
    title,
    path,
    type: options.type ?? fileType(path),
    viewer: options.viewer ?? viewerFor(path),
    url: moduleFileUrl(MODULE_FOLDERS[moduleKey], path),
    description: options.description ?? '',
    tags: options.tags ?? [],
    priority: options.priority ?? 'normal',
  }
}

function remote(moduleKey, group, title, url, options = {}) {
  return {
    id: options.id ?? `${moduleKey}-${slug(group)}-${slug(title)}`,
    moduleKey,
    group,
    title,
    path: url,
    type: options.type ?? fileType(url),
    viewer: options.viewer ?? viewerFor(url),
    url,
    description: options.description ?? '',
    tags: options.tags ?? [],
    priority: options.priority ?? 'normal',
    // Present only for timestamped segments of a longer video, so the player can
    // open at the right point instead of the top of a 6h52m recording.
    ...(options.start != null ? { start: options.start } : {}),
    ...(options.end != null ? { end: options.end } : {}),
  }
}

function hero(file) {
  const base = import.meta.env?.BASE_URL || '/'
  return {
    url: `${base}module-heroes/${file}`,
  }
}

const amlVisual = local(
  'aml',
  'Project figures',
  'Ensemble comparison figure',
  '!Project/docs/Report/Final Report/assets/ensemble_comparison.png',
  {
    id: 'aml-visual-ensemble-comparison',
    description: 'Final project model comparison visual for ensemble-method recall.',
  },
)

const timeSeriesVisual = local(
  'timeSeries',
  'Visual maps',
  'Lecture 8 mind map',
  'Discussions by Professor/NotebookLM Mind Map L8.png',
  {
    id: 'ts-visual-l8-mind-map',
    description: 'Mind-map reference for the ARMA-heavy part of the module.',
  },
)

const mat700Visual = local(
  'mat700',
  'Images',
  'Softmax weights diagram',
  'Tutorials and Examples/images/softmax-weights.png',
  {
    id: 'mat700-visual-softmax',
    description: 'Tutorial image for softmax, weights, and classification notation.',
  },
)

const mat700LectureResources = Array.from({ length: 7 }, (_, index) => {
  const n = index + 1
  return [
    local('mat700', 'Lecture notes', `Lecture ${n} notes`, `Study Notes/MAT700 \u2013 Lecture ${n} Notes.html`, {
      description: `HTML study notes for MAT700 lecture ${n}.`,
      tags: ['notes', `lecture ${n}`],
    }),
    local(
      'mat700',
      'Question banks',
      `Lecture ${n} question bank`,
      `Question Bank/MAT700 \u2013 Lecture ${n} Question Bank.html`,
      {
        description: `Question bank and answer prompts for MAT700 lecture ${n}.`,
        tags: ['questions', `lecture ${n}`],
      },
    ),
  ]
}).flat()

const teamProjectAdminResources = [
  local('teamProject', 'Module admin', 'CMT501 plan and weekly module map', 'About your module/CMT501Plan and weekly-module-map - Tagged.pdf', {
    description: 'Module plan and weekly map for CMT501 Team Project.',
    tags: ['plan', 'weekly map'],
    priority: 'high',
  }),
  local('teamProject', 'Module admin', 'Module description', 'About your module/Module Description.docx', {
    description: 'Official CMT501 module description document.',
    tags: ['module description'],
  }),
]

const teamProjectAssessmentResources = [
  local('teamProject', 'Assessment', 'Assessment 1 demo brief', 'Assessment & Feedback/CMT501 Assessment 1 Demo.pdf', {
    description: 'Assessment 1 demo expectations and marking context.',
    tags: ['assessment', 'demo'],
    priority: 'high',
  }),
  local('teamProject', 'Assessment', 'Assessment 2 report brief', 'Assessment & Feedback/CMT501 Assessment 2 Report.pdf', {
    description: 'Assessment 2 report requirements and evidence expectations.',
    tags: ['assessment', 'report', 'evidence'],
    priority: 'high',
  }),
]

const teamProjectSessionResources = [
  local('teamProject', 'Session 1', 'Individual Git slides', 'Session 1/Individual Git.pdf', {
    description: 'Session 1 Git material for individual workflow catch-up.',
    tags: ['git', 'session 1'],
  }),
  local(
    'teamProject',
    'Session 1',
    'SPIDR user-story splitting article',
    'Session 1/SPIDR_ Five Simple but Powerful Ways to Split User Stories - Mountain Goat Software.pdf',
    {
      description: 'Story-splitting reference for keeping project increments small.',
      tags: ['spidr', 'stories', 'scope'],
    },
  ),
  local('teamProject', 'Session 2', 'Team GitLab slides', 'Session 2/Team Gitlab.pdf', {
    description: 'Team GitLab workflow material from the 2 July session.',
    tags: ['gitlab', 'teamwork', 'session 2'],
    priority: 'high',
  }),
  local(
    'teamProject',
    'Session 2',
    'GitLab Flow article',
    'Session 2/Gitlab Flow - Article about Gitlab Flow. Using branch workflow effectively in Gitlab..pdf',
    {
      description: 'Branch workflow reference for issues, merge requests, review, and merge.',
      tags: ['gitlab', 'branches', 'merge requests'],
      priority: 'high',
    },
  ),
]

const teamProjectTranscriptResources = [
  local(
    'teamProject',
    'Transcripts',
    '2 Jul Student Futures and Teamwork with GitLab transcript',
    'Transcripts/Lecture - 02.07.2026 (Student Futures and Teamwork with Gitlab).txt',
    {
      description: 'Transcript covering GitLab teamwork, issue/milestone practice, and the e-voting exercise.',
      tags: ['2 july', 'gitlab', 'e-voting', 'teamwork'],
      priority: 'high',
    },
  ),
  local(
    'teamProject',
    'Transcripts',
    '2 Jul Team and Project Selections transcript',
    'Transcripts/Lecture - 02.07.2026 (Team and Project Selections).txt',
    {
      description: 'Transcript covering team/project selection and assessment expectations.',
      tags: ['2 july', 'project selection', 'assessment'],
      priority: 'high',
    },
  ),
  local(
    'teamProject',
    'Transcripts',
    '30 Jun Git for Individual Work Part 1 transcript',
    'Transcripts/Lecture - 30.06.2026 (Git for Individual Work Part 1).txt',
    {
      description: 'Earlier Git/GitLab setup transcript for individual workflow recovery.',
      tags: ['git', 'gitlab', '30 june'],
    },
  ),
  local(
    'teamProject',
    'Transcripts',
    '30 Jun Git for Individual Work Part 2 transcript',
    'Transcripts/Lecture - 30.06.2026 (Git for Individual Work Part 2).txt',
    {
      description: "Earlier Git/GitLab transcript including D'Hondt setup context.",
      tags: ['git', 'dhondt', '30 june'],
    },
  ),
]

const timeSeriesPastPaperResources = [
  [2015, 'ma0367_2015_exam-.pdf'],
  [2016, 'ma0367_2016_exam_.pdf'],
  [2017, 'ma0367_2017_exam_.pdf'],
  [2018, 'ma0367_2018_exam_.pdf'],
  [2019, 'ma0367_2019_exam_.pdf'],
  [2020, 'ma0367_2020_exam_.pdf'],
].map(([year, file]) =>
  local(
    'timeSeries',
    'Past papers',
    `${year} past exam paper`,
    `Past Exams Papers/${file}`,
    {
      description: `Real Time Series past exam paper from ${year}.`,
      tags: ['paper', String(year)],
      priority: 'high',
    },
  ),
)

const timeSeriesExamExerciseResources = [3, 4, 5, 6, 7, 8, 9].map((lecture) =>
  local('timeSeries', 'Exam-like exercises', `Exam-like exercises L${lecture}`, `Learning Materials/exam-like-exercises-L${lecture}.pdf`, {
    description: `Template drilling exercises for lecture ${lecture}.`,
    tags: ['exercise', 'exam', `lecture ${lecture}`],
    priority: 'high',
  }),
)

const timeSeriesExerciseSolutionResources = [
  ['L3', 'solution-exam-like-exercises-L3.pdf'],
  ['L4', 'solution-exam-like-exercises-L4.pdf'],
  ['L5', 'solution-exam-like-exercises-L5.pdf'],
  ['L6-L7', 'solution-exam-like-exercises-L6-L7.pdf'],
  ['L8', 'solution-exam-like-exercises-L8.pdf'],
  ['L9', 'solution-exam-like-exercises-L9.pdf'],
].map(([label, file]) =>
  local('timeSeries', 'Exam-like solutions', `Exam-like solutions ${label}`, `Some solutions/${file}`, {
    description: `Worked solution set for Time Series ${label} exam-like exercises.`,
    tags: ['solution', 'exam', label.toLowerCase()],
    priority: 'high',
  }),
)

const timeSeriesCompleteLectureResources = Array.from({ length: 12 }, (_, index) => {
  const lecture = index + 4
  return local('timeSeries', 'Lecture notes', `Complete lecture ${lecture} notes`, `Complete lecture notes/ma3508_lecture${lecture}.pdf`, {
    description: `Complete Time Series lecture ${lecture} notes.`,
    tags: ['lecture notes', `lecture ${lecture}`],
  })
})

const timeSeriesLearningLectureResources = [1, 2, 3, 14, 15].map((lecture) =>
  local('timeSeries', 'Lecture notes', `Lecture ${lecture} learning-material notes`, `Learning Materials/ma3508_lecture${lecture}.pdf`, {
    description: `Learning-material lecture ${lecture} notes.`,
    tags: ['lecture notes', `lecture ${lecture}`],
  }),
)

const timeSeriesGapLectureResources = [
  [4, 'ma3508_lecture4_with_gaps.pdf'],
  [5, 'ma3508_lecture5_with_gaps.pdf'],
  [6, 'ma3508_lecture6_with_gaps.pdf'],
  [7, 'ma3508_lecture7_with_gaps.pdf'],
  [8, 'ma3508_lecture8_with_gaps.pdf'],
  [9, 'ma3508_lecture9_with_gaps(1).pdf'],
  [10, 'ma3508_lecture10_with_gaps.pdf'],
  [11, 'ma3508_lecture11_with_gaps.pdf'],
  [12, 'ma3508_lecture12_with_gaps.pdf'],
  [13, 'ma3508_lecture13_with_gaps(1).pdf'],
].map(([lecture, file]) =>
  local('timeSeries', 'Lecture notes with gaps', `Lecture ${lecture} active-recall notes`, `Learning Materials/${file}`, {
    description: `Fill-in version for active recall on lecture ${lecture}.`,
    tags: ['lecture notes', 'active recall', `lecture ${lecture}`],
  }),
)

const mat700SlideResources = [
  local('mat700', 'Lecture slides', 'Lecture 1 slides', 'Lectures/Lecture1.pdf', {
    description: 'Source MAT700 lecture 1 slides.',
    tags: ['slides', 'lecture 1'],
  }),
  local('mat700', 'Lecture slides', 'Lecture 1 supplement', 'Lectures/Lecture1_supplement.pdf', {
    description: 'Supplementary source slides for MAT700 lecture 1.',
    tags: ['slides', 'lecture 1'],
  }),
  ...Array.from({ length: 6 }, (_, index) => {
    const lecture = index + 2
    return local('mat700', 'Lecture slides', `Lecture ${lecture} slides`, `Lectures/Lecture${lecture}.pdf`, {
      description: `Source MAT700 lecture ${lecture} slides.`,
      tags: ['slides', `lecture ${lecture}`],
    })
  }),
]

const mat700TutorialResources = [
  local('mat700', 'Tutorials', 'Tutorial 1 beamer', 'Tutorials and Examples/Tutorial1-beamer-version.pdf', {
    description: 'Tutorial 1 practice sheet.',
    tags: ['tutorial', 'practice'],
    priority: 'high',
  }),
  local('mat700', 'Tutorials', 'Tutorial 1 solutions', 'Tutorials and Examples/MA3700SolutionsTutorial1.pdf', {
    description: 'Worked solutions for tutorial 1.',
    tags: ['tutorial', 'solution'],
    priority: 'high',
  }),
  local('mat700', 'Tutorials', 'Tutorial 2 beamer', 'Tutorials and Examples/Tutorial2-beamer-version.pdf', {
    description: 'Tutorial 2 practice sheet.',
    tags: ['tutorial', 'practice'],
    priority: 'high',
  }),
  local('mat700', 'Tutorials', 'Tutorial 2 solutions', 'Tutorials and Examples/MA3700SolutionsTutorial2.pdf', {
    description: 'Worked solutions for tutorial 2.',
    tags: ['tutorial', 'solution'],
    priority: 'high',
  }),
  local('mat700', 'Tutorials', 'Tutorial 3 beamer', 'Tutorials and Examples/Tutorial3-beamer-version.pdf', {
    description: 'Tutorial 3 practice sheet.',
    tags: ['tutorial', 'practice'],
    priority: 'high',
  }),
  local('mat700', 'Tutorials', 'Tutorial 3 solutions', 'Tutorials and Examples/Tutorial3_Solutions.pdf', {
    description: 'Worked solutions for tutorial 3.',
    tags: ['tutorial', 'solution'],
    priority: 'high',
  }),
  local('mat700', 'Tutorials', 'MNIST simple demo notebook', 'Tutorials and Examples/MNIST simple Demo.ipynb', {
    description: 'Worked demo notebook for image-data examples.',
    tags: ['notebook', 'mnist'],
  }),
  local('mat700', 'Tutorials', 'MNIST demo archive', 'Tutorials and Examples/MNIST Demo.zip', {
    description: 'Archive for the MNIST tutorial demo.',
    tags: ['mnist', 'archive'],
  }),
]

const mat700StudyNoteImageResources = [
  'ChatGPT Image May 10, 2026, 07_13_11 PM (1).png',
  'ChatGPT Image May 10, 2026, 07_13_11 PM (2).png',
  'ChatGPT Image May 11, 2026, 02_09_44 AM.png',
  'ChatGPT Image May 11, 2026, 02_10_07 AM.png',
  'ChatGPT Image May 11, 2026, 02_11_30 AM.png',
].map((file, index) =>
  local('mat700', 'Derivation notes', `Handwritten derivation image ${index + 1}`, `Study Notes/${file}`, {
    description: 'Handwritten/derivation image note for MAT700 recall.',
    tags: ['image', 'derivation'],
  }),
)

const mat700TranscriptResources = [3, 4, 5, 6, 7].map((lecture) =>
  local(
    'mat700',
    'Transcripts',
    `Online class transcript ${lecture}`,
    `Transcripts/${lecture} - MAT700MA4700 Mathematical Methods for Data Mining online class-202602${lecture === 3 ? '05' : lecture === 4 ? '12' : lecture === 5 ? '16' : lecture === 6 ? '19' : '23'}_151${lecture === 3 ? '131' : lecture === 4 ? '009' : lecture === 5 ? '041' : lecture === 6 ? '057' : '118'}-Meeting Recording.txt`,
    {
      description: `Class transcript for MAT700 online session ${lecture}.`,
      tags: ['transcript', `lecture ${lecture}`],
    },
  ),
)

const amlStudyNoteResources = [
  local('aml', 'Study notes', 'Lab 1 Ex1 study notes', 'Study Notes/CMT307 Lab1 Ex1 Study Notes.md', {
    description: 'Your notes for CMT307 Lab 1 exercise 1.',
    tags: ['notes', 'lab'],
  }),
  local('aml', 'Study notes', 'Lab 1 Ex2 study notes', 'Study Notes/CMT307 Lab1 Ex2-1 Study Notes.md', {
    description: 'Your notes for CMT307 Lab 1 exercise 2.',
    tags: ['notes', 'lab'],
  }),
]

const amlWeeklyMapResources = [
  ['Session 1', 'Session 1 Machine learning overview & data preprocessing/CMT307-weekly-module-map Session1.pdf'],
  ['Session 2', 'Session 2 Data Pre-processing/CMT307-weekly-module-map Session2.pdf'],
  ['Session 3', 'Session 3 Regression, Generalisation & model evaluation/CMT307-weekly-module-map Session3.pdf'],
  ['Session 4', 'Session 4 Classification/CMT307-weekly-module-map Session4.pdf'],
  ['Session 5', 'Session 5 Ensemble Learning/CMT307-weekly-module-map Session5.pdf'],
].map(([session, path]) =>
  local('aml', 'Weekly maps', `${session} weekly module map`, path, {
    description: `Roadmap for ${session}.`,
    tags: ['map', 'session'],
  }),
)

const amlBootcampExerciseResources = Array.from({ length: 9 }, (_, index) => {
  const exercise = index + 1
  const pdfNames = {
    1: 'Exercise 1 Some Interpreter-based maths practice.pdf',
    2: 'Exercise 2 Input, passing data to functions, and ifelse.pdf',
    3: 'Exercise 3 Iterating, and working with strings.pdf',
    4: 'Exercise 4 A Python-based address book.pdf',
    5: 'Exercise 5 A four-of-a-kind game.pdf',
    6: 'Exercise 6 An anagram finder.pdf',
    7: 'Exercise 7 NumPy practice.pdf',
    8: 'Exercise 8 Working with Pandas DataFrames.pdf',
    9: 'Exercise 9 Working with Regular Expressions.pdf',
  }
  const notebookSuffix = exercise === 5 ? '(1)' : ''
  return [
    local('aml', 'Python bootcamp exercises', `Exercise ${exercise} brief`, `Python Bootcamp/Excercises/${pdfNames[exercise]}`, {
      description: `Python bootcamp exercise ${exercise} brief.`,
      tags: ['python', 'exercise'],
    }),
    local('aml', 'Python bootcamp exercises', `Exercise ${exercise} questions notebook`, `Python Bootcamp/Excercises/exercise-${exercise}_questions${notebookSuffix}.ipynb`, {
      description: `Question notebook for Python bootcamp exercise ${exercise}.`,
      tags: ['python', 'notebook', 'questions'],
    }),
    local('aml', 'Python bootcamp exercises', `Exercise ${exercise} answers notebook`, `Python Bootcamp/Excercises/exercise-${exercise}_answers${notebookSuffix}.ipynb`, {
      description: `Answer notebook for Python bootcamp exercise ${exercise}.`,
      tags: ['python', 'notebook', 'answers'],
    }),
  ]
}).flat()

const amlBootcampSlideResources = [
  ['Introduction', 'python-bootcamp_introduction.html'],
  ['01 first steps', 'python-bootcamp_01_first-steps-with-python.html'],
  ['02 variables and expressions', 'python-bootcamp_02_vars-exprs-and-statements.html'],
  ['03 conditional statements', 'python-bootcamp_03_conditional-statements.html'],
  ['04 functions intro', 'python-bootcamp_04_intro-to-functions.html'],
  ['05 repetition IO', 'python-bootcamp_05_repetition-input-and-output.html'],
  ['06 function definition', 'python-bootcamp_06_function-definition.html'],
  ['07 iteration', 'python-bootcamp_07_iteration.html'],
  ['08 strings', 'python-bootcamp_08_strings.html'],
  ['09 lists', 'python-bootcamp_09_lists.html'],
  ['10 dictionaries', 'python-bootcamp_10_dictionaries.html'],
  ['11 global variables', 'python-bootcamp_11_global-variables.html'],
  ['12 tuples', 'python-bootcamp_12_tuples.html'],
  ['13 files', 'python-bootcamp_13_files.html'],
  ['14 advanced features', 'python-bootcamp_14_advanced-features.html'],
  ['15 NumPy', 'python-bootcamp_15_numpy.html'],
  ['17 regular expressions', 'python-bootcamp_17_regular-expressions(1).html'],
].map(([title, file]) =>
  local('aml', 'Python support', `Python bootcamp ${title}`, `Python Bootcamp/Lecture Slides/${file}`, {
    description: `Python bootcamp slide deck: ${title}.`,
    tags: ['python', 'slides'],
  }),
)

const amlSupplementaryResources = [
  local('aml', 'Supplementary reading', 'Data preprocessing reading', 'Session 2 Data Pre-processing/2020 Data preprocessing.pdf', {
    description: 'Supplementary reading on data preprocessing.',
    tags: ['reading', 'preprocessing'],
  }),
  local('aml', 'Supplementary reading', 'Model evaluation reading', 'Session 3 Regression, Generalisation & model evaluation/2020 Model Evaluation, Model Selection, and Algorithm Selection i.pdf', {
    description: 'Supplementary reading on model evaluation and selection.',
    tags: ['reading', 'evaluation'],
  }),
  local('aml', 'Supplementary reading', 'Hyperparameter optimization reading', 'Session 4 Classification/2023 - Bischl - Hyperparameter optimization  Foundations  algorithms  best practices  and open.pdf', {
    description: 'Supplementary reading on hyperparameter optimization.',
    tags: ['reading', 'hyperparameters'],
  }),
  local('aml', 'Supplementary reading', 'Avoid ML pitfalls guide', 'Session 5 Ensemble Learning/[2108.02497] How to avoid machine learning pitfalls_ a guide for academic researchers.html', {
    description: 'Guide to avoiding common machine-learning pitfalls.',
    tags: ['reading', 'pitfalls'],
  }),
  local('aml', 'Supplementary reading', 'Career in AI ebook', 'Session 5 Ensemble Learning/How to Build Your Career in AI eBook - Andrew Ng Collected Insights.html', {
    description: 'Optional broader AI career reading.',
    tags: ['reading', 'career'],
  }),
]

// One resource per specific video, generated from the verified catalogue in
// amlVideoLibrary.js. These used to be three whole-playlist entries, which meant
// study progress recorded against "the Caltech playlist" applied to every card
// that linked it. Splitting them makes progress mean one video.
const SESSION_GROUP = {
  s1: 'Video — S1 workflow',
  s2: 'Video — S2 preprocessing',
  s3: 'Video — S3 regression & generalisation',
  s4: 'Video — S4 classification & tuning',
  s5: 'Video — S5 ensembles',
}

const amlVideoLectureResources = AML_VIDEOS.map((video) =>
  remote('aml', SESSION_GROUP[video.session] ?? 'Video lectures', video.title, video.url, {
    id: video.id,
    description:
      `${video.source}. ${video.minutes} min` +
      (video.segmentLabel ? ` — watch ${video.segmentLabel} of the full course only.` : '.') +
      (video.depth === 'deep' ? ' Full-length lecture: optional depth, not a first pass.' : ''),
    tags: [
      'video',
      video.session,
      ...(video.depth === 'deep' ? ['deep-dive'] : ['core']),
      ...(video.segmentLabel ? ['segment'] : []),
    ],
    priority: video.depth === 'deep' ? 'normal' : 'high',
    type: 'YOUTUBE',
    viewer: 'youtube',
    start: video.start,
    end: video.end,
  }),
)

export const STUDY_MODULES = [
  {
    id: 'aml',
    viewId: 'aml',
    moduleGroup: 'Applied ML',
    code: 'CMT307',
    label: 'Applied ML',
    title: 'Applied Machine Learning',
    subtitle: 'Notebook-first recovery, open-book command pack, and project evidence.',
    examShape: 'Open-book class-test style work: fast navigation, lab reconstruction, model choice, and leakage-safe reasoning.',
    accent: '--chart-aml',
    hero: hero('aml.svg'),
    visual: amlVisual,
    objectives: [
      'Run each lab clean before expanding notes.',
      'Turn every lab into one reusable exam workflow or comparison table.',
      'Keep the ASHRAE project as the concrete ensemble-learning anchor.',
    ],
    operatingRules: [
      'Use notebooks as the source of truth; slides explain only what the lab exposes.',
      'Every study block must leave evidence: executed notebook, one-page sheet, or error-log entry.',
      'For open-book speed, build lookup paths rather than large prose notes.',
    ],
    resources: [
      ...amlStudyNoteResources,
      local(
        'aml',
        'Session 1',
        'S1 slides',
        'Session 1 Machine learning overview & data preprocessing/Session1-Overview of Machine Learning.pdf',
        { description: 'Machine-learning overview and first workflow pass.', tags: ['slides', 'workflow'] },
      ),
      local(
        'aml',
        'Session 1',
        'Lab 1 sheet',
        'Session 1 Machine learning overview & data preprocessing/Practical 1/CMT307 Lab 1.pdf',
        { description: 'Practical sheet for the first lab.', tags: ['lab', 'workflow'] },
      ),
      local(
        'aml',
        'Session 1',
        'Lab 1 Ex1 notebook',
        'Session 1 Machine learning overview & data preprocessing/Practical 1/CMT307Lab1Ex1.ipynb',
        { description: 'Notebook to run and annotate for Card 1.', tags: ['notebook'] },
      ),
      local(
        'aml',
        'Session 1',
        'Lab 1 Ex2 notebook',
        'Session 1 Machine learning overview & data preprocessing/Practical 1/CMT307Lab1Ex2-1.ipynb',
        { description: 'Second Lab 1 notebook for the five-stage workflow page.', tags: ['notebook'] },
      ),
      local(
        'aml',
        'Session 2',
        'S2 preprocessing slides',
        'Session 2 Data Pre-processing/Session2-Data preprocessing.pdf',
        { description: 'Missing values, encoding, scaling, and leakage context.', tags: ['slides', 'preprocessing'] },
      ),
      local(
        'aml',
        'Session 2',
        'Lab 2 preprocessing notebook',
        'Session 2 Data Pre-processing/Practical 2/CMT307_Lab2_data_exploration_preprocessing.ipynb',
        { description: 'Titanic and credit-approval preprocessing lab.', tags: ['notebook', 'preprocessing'] },
      ),
      local(
        'aml',
        'Session 2',
        'Lab 2 solution notebook',
        'Session 2 Data Pre-processing/Practical 2/CMT307_Lab2_solution.ipynb',
        { description: 'Reference notebook for repair after your own attempt.', tags: ['solution'] },
      ),
      local(
        'aml',
        'Session 3',
        'S3 regression and evaluation slides',
        'Session 3 Regression, Generalisation & model evaluation/Session3-Regression, Generalisation & Model evaluation.pdf',
        { description: 'Regression, model evaluation, validation, and generalisation.', tags: ['slides', 'regression'] },
      ),
      local(
        'aml',
        'Session 3',
        'Lab 3 linear models notebook',
        'Session 3 Regression, Generalisation & model evaluation/CMT307_Lab3_TrainingLinearModels.ipynb',
        { description: 'Linear models and evaluation reconstruction target.', tags: ['notebook', 'regression'] },
      ),
      local('aml', 'Session 4', 'S4 classification slides', 'Session 4 Classification/Session4_Classification.pdf', {
        description: 'Classifiers, metrics, and model comparison.',
        tags: ['slides', 'classification'],
      }),
      local('aml', 'Session 4', 'Lab 4 classification notebook', 'Session 4 Classification/CMT307_Lab4_Classification.ipynb', {
        description: 'Classification lab for comparison table and metric recall.',
        tags: ['notebook', 'classification'],
      }),
      local('aml', 'Session 5', 'S5 ensemble slides', 'Session 5 Ensemble Learning/Session5_Ensemble_Learning.pdf', {
        description: 'Bagging, boosting, random forests, and ensemble logic.',
        tags: ['slides', 'ensembles'],
      }),
      local(
        'aml',
        'Session 5',
        'Lab 5 ensemble notebook',
        'Session 5 Ensemble Learning/CMT307_Lab5_ensemble_learning_and_random_forests.ipynb',
        { description: 'Random forests and ensemble-learning reconstruction target.', tags: ['notebook', 'ensembles'] },
      ),
      local('aml', 'Project', 'Project explanation', '!Project/docs/Project_Explained.md', {
        description: 'Plain-English guide to the ASHRAE project pipeline.',
        tags: ['project', 'evidence'],
      }),
      local('aml', 'Project', 'Final project report', '!Project/docs/Report/Final Report/Final Project Report.pdf', {
        description: 'Final ASHRAE report for project evidence and ensemble examples.',
        tags: ['project', 'report'],
      }),
      amlVisual,
      local('aml', 'Project figures', 'Feature importance figure', '!Project/docs/Report/Final Report/assets/feat_imp.png', {
        description: 'Feature-importance visual for model interpretation revision.',
        tags: ['project', 'image'],
      }),
      local('aml', 'Project figures', 'Pipeline diagram', '!Project/docs/Report/Final Report/source/Pipeline.png', {
        description: 'End-to-end data pipeline visual.',
        tags: ['project', 'pipeline'],
      }),
      ...amlWeeklyMapResources,
      ...amlVideoLectureResources,
      local('aml', 'Python support', 'Python bootcamp information', 'Python Bootcamp/Python Bootcamp Information.pdf', {
        description: 'Fallback support if syntax, NumPy, or pandas slows lab execution.',
        tags: ['python', 'support'],
      }),
      local('aml', 'Python support', 'Pandas bootcamp slide', 'Python Bootcamp/Lecture Slides/python-bootcamp_16_pandas.html', {
        description: 'Pandas refresher for lab data handling.',
        tags: ['python', 'pandas'],
      }),
      ...amlBootcampSlideResources,
      ...amlBootcampExerciseResources,
      ...amlSupplementaryResources,
    ],
    drills: [
      {
        title: 'Leakage audit',
        detail: 'For any preprocessing step, say whether it is fitted on train only, then identify the object that stores the fit.',
        output: 'One leakage-safe preprocessing checklist.',
      },
      {
        title: 'Model comparison row',
        detail: 'For logistic regression, kNN, SVM, tree, random forest, and boosting: state assumption, scaling need, strength, failure mode.',
        output: 'A compact classifier and ensemble table.',
      },
      {
        title: 'Open-book navigation race',
        detail: 'Pick 20 likely exam prompts and time the first useful file, cell, or formula lookup.',
        output: 'Lookup index with slow paths repaired.',
      },
    ],
    recipes: [
      {
        title: 'Preprocessing pipeline frame',
        detail: 'Name the split first, fit scaler/encoder/imputer on train only, transform both, then state in one line why this prevents leakage.',
      },
      {
        title: 'Model choice justification',
        detail: 'State the data shape and target, name two candidate models, pick one on assumption fit and scaling cost, then cite the metric that would confirm the choice.',
      },
      {
        title: 'Overfitting diagnosis frame',
        detail: 'Compare train vs validation curves, name the bias-variance side you are on, then propose the matching lever: regularisation, more data, or a simpler/deeper model.',
      },
    ],
  },
  {
    id: 'time-series',
    viewId: 'time-series',
    moduleGroup: 'Time Series',
    code: 'MAT508',
    label: 'Time Series',
    title: 'Time Series',
    subtitle: 'Formula-first paper practice: packs, templates, R snippets, and mock mapping.',
    examShape: 'Two-hour mathematical exam: definitions, proofs, ARMA calculations, spectral methods, forecasting, and R-style workflows.',
    accent: '--chart-ts',
    hero: hero('time-series.svg'),
    visual: timeSeriesVisual,
    objectives: [
      'Convert each pack into formulas, worked examples, and closed-book recall.',
      'Prioritise Packs D and E because ARMA definitions, causality, fitting, and forecasting carry high exam value.',
      'Use timed papers to expose broken templates instead of rereading broadly.',
    ],
    operatingRules: [
      'Definitions are free marks; recall them before solving calculations.',
      'For every formula, keep one example where you can reproduce each line.',
      'Past-paper attempts must end with an error-log update.',
    ],
    resources: [
      local(
        'timeSeries',
        'Study packs',
        'Pack A - L1-L2 intro and smoothing',
        'Slides Explained/AI Notes/TS_Study_Pack_A_L1_L2_FINAL_LOCKED.html',
        { description: 'Intro, smoothing, decomposition, and first-pass examples.', tags: ['pack', 'smoothing'] },
      ),
      local(
        'timeSeries',
        'Study packs',
        'Pack B - L3-L4 stationarity',
        'Slides Explained/AI Notes/TS_Study_Pack_B_L3_L4_FINAL_LOCKED.html',
        { description: 'Strict stationarity, WSS, and named-process covariance work.', tags: ['pack', 'stationarity'] },
      ),
      local(
        'timeSeries',
        'Study packs',
        'Pack C - L5-L7 spectral and prediction',
        'Slides Explained/AI Notes/TS_Study_Pack_C_L5_L7_FINAL_LOCKED.html',
        { description: 'Spectral density, estimation, prediction, and BLUP links.', tags: ['pack', 'spectral'] },
      ),
      local(
        'timeSeries',
        'Study packs',
        'Pack D - L8-L10 ARMA definitions',
        'Slides Explained/AI Notes/TS_Study_Pack_D_L8_L10_FINAL_LOCKED.html',
        { description: 'High-priority ARMA definitions, causality, and invertibility.', tags: ['pack', 'arma'], priority: 'high' },
      ),
      local(
        'timeSeries',
        'Study packs',
        'Pack E - L11-L13 ARMA fitting',
        'Slides Explained/AI Notes/TS_Study_Pack_E_L11_L13_FINAL_LOCKED.html',
        { description: 'High-priority fitting, estimation, and forecasting pack.', tags: ['pack', 'forecasting'], priority: 'high' },
      ),
      local(
        'timeSeries',
        'Study packs',
        'Pack F - L14-L15 real data workflow',
        'Slides Explained/AI Notes/TS_Study_Pack_F_L14_L15_FINAL_LOCKED.html',
        { description: 'Real data workflow and final application material.', tags: ['pack', 'workflow'] },
      ),
      local(
        'timeSeries',
        'Quick reference',
        'Master formula and R code sheet',
        'Slides Explained/AI Notes/TS_Master_Formula_Definition_R_Code_Sheet_FINAL_LOCKED_CANDIDATE.html',
        { description: 'Combined definitions, formulas, and R-code reference.', tags: ['formula', 'r'] },
      ),
      local(
        'timeSeries',
        'Quick reference',
        'Master exam question bank',
        'Slides Explained/AI Notes/TS_Master_Exam_Question_Bank_By_Template_FINAL_LOCKED.html',
        { description: 'Question bank organised by exam template.', tags: ['questions', 'templates'] },
      ),
      local(
        'timeSeries',
        'Quick reference',
        'Past paper and mock mapping audit',
        'Slides Explained/AI Notes/TS_Past_Paper_Mock_Mapping_Audit_FINAL_LOCKED.html',
        { description: 'Map of papers, mocks, and recurring templates.', tags: ['past papers', 'audit'] },
      ),
      local('timeSeries', 'Quick reference', 'R comprehensive cheat sheet', 'Slides Explained/R_Comprehensive_Cheat_Sheet.pdf', {
        description: 'R-code and syntax cheat sheet for Time Series workflows.',
        tags: ['r', 'cheat sheet'],
        priority: 'high',
      }),
      local('timeSeries', 'Quick reference', 'Lecture 5 R supplement', 'Learning Materials/ma3508_lecture5_R_supplement.pdf', {
        description: 'R supplement for lecture 5 workflows.',
        tags: ['r', 'lecture 5'],
      }),
      // The only videos this module has, and the only lecturer-assigned videos in the
      // whole campaign: set as Lecture 1 homework on p.20 of ma3508_lecture1.pdf.
      // Both are beginner "install R and use it as a calculator" tutorials, so they
      // are attached as optional support on the R-skeleton card only — not to the
      // Pack A cards, whose content is smoothing and decomposition, not R setup.
      remote('timeSeries', 'R setup videos', 'An Introduction to R — brief tutorial', 'https://www.youtube.com/watch?v=LjuXiBjxryQ', {
        id: 'ts-video-r-intro-tutorial',
        description: 'Set as Lecture 1 homework. 17 min, beginner R setup — refresher only, no time-series content.',
        tags: ['video', 'r', 'setup', 'lecture 1 homework'],
        type: 'YOUTUBE',
        viewer: 'youtube',
      }),
      remote('timeSeries', 'R setup videos', 'R Tutorial: Introduction to R', 'https://www.youtube.com/watch?v=7cGwYMhPDUY', {
        id: 'ts-video-r-tutorial-intro',
        description: 'Set as Lecture 1 homework. 20 min, beginner R setup — refresher only, no time-series content.',
        tags: ['video', 'r', 'setup', 'lecture 1 homework'],
        type: 'YOUTUBE',
        viewer: 'youtube',
      }),
      ...timeSeriesPastPaperResources,
      local('timeSeries', 'Past papers', 'Mock exam', 'Some solutions/ma3508_mock_exam.pdf', {
        description: 'Mock exam for timed Time Series practice.',
        tags: ['mock', 'exam'],
        priority: 'high',
      }),
      local('timeSeries', 'Past papers', 'Mock exam solution', 'Some solutions/ma3508_mock_exam_solution.pdf', {
        description: 'Worked solution for the Time Series mock exam.',
        tags: ['mock', 'solution'],
        priority: 'high',
      }),
      ...timeSeriesExamExerciseResources,
      ...timeSeriesExerciseSolutionResources,
      ...timeSeriesLearningLectureResources,
      ...timeSeriesCompleteLectureResources,
      ...timeSeriesGapLectureResources,
      local('timeSeries', 'Video walkthroughs', 'Decoding Time Series recipe', 'Discussions by Professor/Decoding_Time_s_Recipe.mp4', {
        description: 'Professor walkthrough video for Time Series recipe decoding.',
        tags: ['video', 'walkthrough'],
      }),
      timeSeriesVisual,
    ],
    drills: [
      {
        title: 'Definition sweep',
        detail: 'Write WSS, strict stationarity, ARMA(p,q), causality, invertibility, short memory, long memory from memory.',
        output: 'A checked two-column recall sheet.',
      },
      {
        title: 'ARMA template drill',
        detail: 'For AR(1), AR(2), MA(1), and ARMA(p,q), write the model, condition, autocovariance move, and forecast move.',
        output: 'One template card per model family.',
      },
      {
        title: 'Timed paper triage',
        detail: 'Attempt first, mark second, then tag each miss by template rather than by lecture number.',
        output: 'Error log with repair cards.',
      },
    ],
    recipes: [
      {
        title: 'AR(2) causality check',
        detail: 'Use the three inequalities for the exam shortcut, then confirm by discussing roots outside the unit disk if proof is requested.',
      },
      {
        title: 'Forecasting answer frame',
        detail: 'State model and mean, compute the h-step predictor recursively, then attach the correct MSE and confidence interval.',
      },
      {
        title: 'Spectral density move',
        detail: 'Start from the inverse Fourier relation, expand any cosine term, then identify which lags survive.',
      },
    ],
  },
  {
    id: 'team-project',
    viewId: 'team-project',
    moduleGroup: 'Group Project',
    code: 'CMT501',
    label: 'Team Project',
    title: 'Team Project',
    subtitle: 'Protected capacity for the live waste-management team project; detailed management stays in its own app.',
    examShape: 'Team software project: integrate a working product, submit a nominally 20-minute team video, and preserve evidence for the individual report.',
    accent: '--chart-project',
    hero: hero('team-project.svg'),
    visual: hero('team-project.svg'),
    objectives: [
      'Protect only the capacity reserved in the Summer Rescue timetable.',
      'Work on the current backend, integration, review, or coordination bottleneck chosen in the project-management app.',
      'Leave a short contribution/evidence record without recreating the detailed issue board here.',
    ],
    operatingRules: [
      'A normal project block stops at two hours; use roughly 75 minutes delivery, 30 minutes review/coordination, and 15 minutes evidence.',
      'If a teammate slips, reduce scope, document the dependency, and escalate before absorbing unlimited rescue work.',
      'After the 2 August internal handoff, allow integration, QA, recording, submission, and evidence only — no new scope.',
    ],
    resources: [
      ...teamProjectAdminResources,
      ...teamProjectAssessmentResources,
      ...teamProjectSessionResources,
      ...teamProjectTranscriptResources,
    ],
    drills: [
      {
        title: 'Current bottleneck block',
        detail: 'Open the separate project board, choose the single current bottleneck, and work it for the protected block only.',
        output: 'One reviewed delivery, integration, or coordination outcome.',
      },
      {
        title: 'Integration closeout',
        detail: 'Check the current backend/ML/frontend/database seam and resolve or clearly log one blocker.',
        output: 'A merged change, test result, or owned blocker with next action.',
      },
      {
        title: 'Evidence closeout',
        detail: 'At the end of the block, preserve the relevant issue, merge request, review, decision, test, or meeting evidence.',
        output: 'A short contribution log entry stored with the project.',
      },
    ],
    recipes: [
      {
        title: 'Two-hour capacity frame',
        detail: 'Use 75 minutes for the current technical bottleneck, 30 minutes for review/coordination, and 15 minutes for evidence and the next handoff.',
      },
      {
        title: 'Rescue decision frame',
        detail: 'Name the missed dependency, assess deadline impact, cut scope or reassign, record the decision, and use extra capacity only when the submission is genuinely at risk.',
      },
    ],
  },
  {
    id: 'mat700',
    viewId: 'mat700',
    moduleGroup: 'MAT700',
    code: 'MAT700',
    label: 'Data Mining',
    title: 'Mathematical Methods for Data Mining',
    subtitle: 'Rebuild seven lectures through tutorials, timed recall, and papers.',
    examShape: 'Written mathematical/data-mining exam: definitions, short proofs, TF-IDF, similarity, PageRank, clustering, boosting, and evaluation metrics.',
    accent: '--chart-mat700',
    hero: hero('mat700.svg'),
    visual: mat700Visual,
    objectives: [
      'Build a safe exam performance from tutorial and question-bank fluency.',
      'Use tutorial and question-bank problems before broad slide reading.',
      'Focus on high-yield templates that can be solved under time.',
    ],
    operatingRules: [
      'Use the protected MAT700 blocks; do not let anxiety turn into unbounded rereading.',
      'Every MAT700 block needs at least one solved problem or recipe rewrite.',
      'Recall first, check second, and feed every miss into one error log.',
    ],
    resources: [
      local('mat700', 'Formula sheets', 'Master formula cheat sheet', 'MAT700_Master_Formula_Cheat_Sheet.html', {
        description: 'Combined formula reference for lectures 1-7.',
        tags: ['formula'],
      }),
      local(
        'mat700',
        'Formula sheets',
        'Two-hour exam cheat sheet',
        'Study Notes/MAT700_2_Hour_Exam_Cheat_Sheet_COMPLETE.html',
        { description: 'Condensed final revision sheet.', tags: ['formula', 'exam'] },
      ),
      ...mat700SlideResources,
      ...mat700LectureResources,
      local('mat700', 'Past papers', '2025 past paper', 'MAT700 Mathematical Methods for Data 2025.pdf', {
        description: 'Newest past paper in the MAT700 folder.',
        tags: ['paper', '2025'],
      }),
      local('mat700', 'Past papers', '2024 past paper', 'MAT700 Mathematical Methods for Data 2024.pdf', {
        description: 'Past paper for timed practice.',
        tags: ['paper', '2024'],
      }),
      local('mat700', 'Past papers', '2023 past paper', 'MAT700 Mathematical Methods for Data 2023.pdf', {
        description: 'Past paper for topic mapping.',
        tags: ['paper', '2023'],
      }),
      ...mat700TutorialResources,
      mat700Visual,
      local('mat700', 'Images', 'MNIST examples', 'Tutorials and Examples/images/mnist.jpg', {
        description: 'Image-data reference for classification examples.',
        tags: ['image', 'mnist'],
      }),
      local('mat700', 'Images', 'MNIST matrix', 'Tutorials and Examples/images/MNIST-Matrix.png', {
        description: 'Matrix representation of image data.',
        tags: ['image', 'mnist'],
      }),
      local('mat700', 'Images', 'Neuron example', 'Tutorials and Examples/images/neuron1.jpeg', {
        description: 'Neuron example image for neural-network notation.',
        tags: ['image', 'neuron'],
      }),
      ...mat700StudyNoteImageResources,
      local('mat700', 'Derivation notes', 'Lecture 1 handwritten notes', 'Lecture 1 handwritten notes - incomplete.pdf', {
        description: 'Handwritten lecture 1 notes and derivations.',
        tags: ['notes', 'handwritten'],
      }),
      ...mat700TranscriptResources,
      local('mat700', 'Module admin', 'MAT700 module description', 'MAT700 Mathematical Methods for Data Mining module description.docx', {
        description: 'Module description document for MAT700.',
        tags: ['module description'],
      }),
    ],
    drills: [
      {
        title: 'TF-IDF matrix',
        detail: 'Build the term-document count table, compute TF, compute IDF, multiply, then compare only in the same vocabulary order.',
        output: 'One clean worked matrix.',
      },
      {
        title: 'Similarity and distance proof',
        detail: 'For Jaccard, bags, edit distance, and L-infinity, state the formula and one counterexample/proof move.',
        output: 'Proof checklist with one worked question.',
      },
      {
        title: 'PageRank or clustering trace',
        detail: 'Set up the matrix or distance table, show every iteration/update, then state the interpretation.',
        output: 'Timed algorithm trace.',
      },
    ],
    recipes: [
      {
        title: 'PageRank iteration',
        detail: 'Make the transition matrix column-stochastic, fix dead ends, apply damping, iterate, and check the rank vector sums to one.',
      },
      {
        title: 'Clustering trace',
        detail: 'For hierarchical clustering, show the chosen linkage. For k-means, show assignment and centroid recomputation.',
      },
      {
        title: 'AdaBoost weight update',
        detail: 'Compute weighted error, alpha, reweight mistakes/correct predictions, renormalise, and state the final weighted vote.',
      },
    ],
  },
]

export const STUDY_MODULE_MAP = Object.fromEntries(STUDY_MODULES.map((module) => [module.id, module]))
