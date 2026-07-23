// Per-card study sequence: the "how / what / in what order" layer.
//
// Two things already exist and are NOT duplicated here:
//   * card.checklist — what to do, already roughly ordered.
//   * cardResources.js / relatedNotesForCard (utils/knowledge.js) — a broad,
//     session/lecture/pack-keyed pool of "might be relevant" resources and
//     notes, capped at up to 24 resources and every note that shares a
//     session key (which, for a card like "AML S2 — ..." with dozens of S2
//     notes, means every S2 note, code recipes and all, on the concepts card
//     that hasn't touched code yet).
//
// What's missing is the plan: for THIS card, given its checklist and its
// estimated hours, exactly which few resources and notes to open, in what
// order, and why — sized so a limited study block is spent on the right
// handful of items instead of triaging a flat pile. That's what this file
// adds, one entry per card, in the same spirit as amlVideoPlan.js's explicit
// per-card table (and deliberately separate from it, and from the generated
// baseCards.js, for the same reason: hand-curated content should not live in
// a generated file or be inferred from a regex over the title).
//
// `concepts` are the card's must-cover items, stated plainly so progress can
// be checked against them directly rather than against the checklist prose.
// `steps` is the ordered sequence. Each step names the specific resourceIds
// (from studyModules.js) and/or noteIds (from src/data/knowledge/*.md) it
// needs — ids the reader can click straight through to.
//
// `minutes` are sized against card.estimatedHours AS COMPRESSED BY THE 20 JUL
// FRESH-START RE-PLAN (summerRescuePlan.js: fitExamCardsToTimetable), not the
// original, roomier hours in baseCards.js — e.g. card-001 shows 2.25h live,
// not the 3.5h its own checklist text was written against. Video-watch steps
// stay at their real length (a video is what it is); read/write/test steps
// are the ones cut, and cut for real — fewer notes per step, not just smaller
// numbers next to the same content — with an explicit steer to the single
// highest-value item first when a step still can't fit. If a future re-plan
// changes a card's estimatedHours again, re-check the steps below still sum
// close to it; the app renders whatever sum results, right or wrong.
//
// Cards with no entry fall back to the checklist plus the existing
// broad resource/note matching, untouched — this is additive only.

export const CARD_STUDY_SEQUENCE = {
  'card-001': {
    "concepts": [
      "Supervised vs unsupervised learning, with one example each",
      "Classification vs regression, with one example each",
      "The 5-stage ML workflow: data → EDA → preprocess → model → evaluate"
    ],
    "steps": [
      {
        "label": "Watch: ML introduction + terminology",
        "kind": "watch",
        "minutes": 27,
        "resourceIds": [
          "aml-video-ubc-1-0-ml-introduction",
          "aml-video-ubc-2-1-ml-terminology"
        ],
        "instruction": "Watch both back to back for vocabulary only — what a model is, what \"learning\" means here. Don't take notes yet, just absorb the shape of it.",
        "checklistText": "Watch UBC 1.0 and 2.1 back-to-back for vocabulary only, without taking notes yet."
      },
      {
        "label": "Watch: course workflow segment (0:02–0:51)",
        "kind": "watch",
        "minutes": 49,
        "resourceIds": [
          "aml-video-course-s1-workflow"
        ],
        "instruction": "This is the 5-stage workflow demonstrated end to end on a real dataset. Watch for the SHAPE of the pipeline (what comes before what) — the code syntax is not the point yet.",
        "checklistText": "Watch the Applied ML workflow clip for how the 5 stages connect, ignoring code syntax for now."
      },
      {
        "label": "Read: S1 \"Overview of Machine Learning\" slides",
        "kind": "read",
        "minutes": 20,
        "resourceIds": [
          "aml-session-1-s1-slides"
        ],
        "noteIds": [
          "s1-what-is-ml",
          "s1-ai-ml-dl",
          "s1-supervised",
          "s1-unsupervised"
        ],
        "instruction": "Skim the slides once, then lean on the four notes for the actual definitions. Write one original example each for supervised, unsupervised, classification, and regression — don't reuse the slide's example, that's not evidence you understood it. If time is short, the two paradigm notes matter more than a full slide read.",
        "checklistText": "Skim the S1 slides once, then write one original example each for supervised, unsupervised, classification, and regression."
      },
      {
        "label": "Write: the 5-stage workflow page",
        "kind": "write",
        "minutes": 25,
        "noteIds": [
          "s1-five-stage-process",
          "s1-module-shape"
        ],
        "instruction": "Closed-book: one line per stage (data → EDA → preprocess → model → evaluate), in your own words. This is AML_S1_workflow.md — the evidence this card asks for. s1-module-shape is a 90-second read on what the class test actually looks like; worth it even under time pressure.",
        "checklistText": "Write AML_S1_workflow.md closed-book: one line per stage from data to evaluation, then skim the exam-shape note."
      },
      {
        "label": "Self-test: closed-book recite",
        "kind": "test",
        "minutes": 14,
        "noteIds": [
          "s1-paradigm-picker"
        ],
        "instruction": "Recite the 5 stages from memory, then run the paradigm-picker cheat sheet's quick tests. List any term you can't place cold — carry that list into card-005 (the Lab 1 run), where code will force you to resolve it.",
        "checklistText": "Recite the 5 stages from memory, run the paradigm-picker quick tests, and list any term you can't place."
      }
    ]
  },
  'card-003': {
    "concepts": [
      "Preprocessing order: missing → encode → scale → split",
      "Missing-values rule: drop vs impute (mean/median/mode) — with reasoning",
      "Encoding rule: one-hot vs label/ordinal — which and why",
      "Scaling rule: which model families need it, which don't",
      "Leakage rule: fit every transformer on train only"
    ],
    "steps": [
      {
        "label": "Watch: preprocessing intro + imputation & scaling",
        "kind": "watch",
        "minutes": 29,
        "resourceIds": [
          "aml-video-ubc-5-1-preprocessing-intro",
          "aml-video-ubc-5-2-imputation-scaling"
        ],
        "instruction": "Watch for the ORDER things happen in, not the code — that order is what the rest of this card asks you to write down.",
        "checklistText": "Watch the imputation and scaling videos focused on the order operations happen in, not the code."
      },
      {
        "label": "Read: S2 \"Data preprocessing\" slides",
        "kind": "read",
        "minutes": 16,
        "resourceIds": [
          "aml-session-2-s2-preprocessing-slides"
        ],
        "noteIds": [
          "s2-why",
          "s2-dirty-data"
        ],
        "instruction": "Read s2-why first — one line, and it's a quotable exam line. Skim the slides holding \"missing → encode → scale → split\" as the order to check every step against; s2-dirty-data if time allows.",
        "checklistText": "Read the why-preprocessing note first, then skim the slides checking each step against the missing-encode-scale-split order."
      },
      {
        "label": "Write: all four rules in one pass",
        "kind": "write",
        "minutes": 30,
        "noteIds": [
          "s2-missing-four-strategies",
          "s2-encoding-picker",
          "s2-why-scale",
          "s2-trap-encode-before-split"
        ],
        "instruction": "This card is short on time, so do all four rules as one tight pass rather than four separate write-ups: missing-values (drop vs impute mean/median/mode + when), encoding (one-hot vs ordinal + when), scaling (which model families need it and why — s2-why-scale gives you three ready reasons), and leakage (fit every transformer on train only — s2-trap-encode-before-split states it as the mistake it prevents). One paragraph each, in your own words. If something has to give, keep scaling and leakage — they're the two that show up as planted faults in the lab.",
        "checklistText": "Write one paragraph each on missing-value handling, encoding choice, scaling need, and the fit-on-train-only leakage rule."
      }
    ]
  },
  'card-005': {
    "concepts": [
      "Both Lab 1 notebooks run clean, top to bottom",
      "Dataset shape, target (Revenue), and class balance recorded",
      "Every cell labelled with its workflow stage",
      "Terms flagged in card-001 resolved"
    ],
    "steps": [
      {
        "label": "Set up: open the lab sheet, review flagged terms",
        "kind": "read",
        "minutes": 5,
        "resourceIds": [
          "aml-session-1-lab-1-sheet"
        ],
        "noteIds": [
          "s1-import-recall"
        ],
        "instruction": "Quick skim of the lab sheet and your flagged-terms list from card-001 — just enough to know what each exercise is asking before you run anything.",
        "checklistText": "Skim the Lab 1 sheet and your card-001 flagged-terms list before running any exercise."
      },
      {
        "label": "Run: Lab 1 Ex1 notebook, top to bottom",
        "kind": "do",
        "minutes": 55,
        "resourceIds": [
          "aml-session-1-lab-1-ex1-notebook"
        ],
        "noteIds": [
          "s1-debug-triage",
          "s1-trap-split-order"
        ],
        "instruction": "Run every cell in order. When something breaks, use s1-debug-triage's \"where to look first\" order before guessing — most breaks here are import/path/version, exactly what the checklist warns about. s1-trap-split-order covers the single most common way train_test_split output gets unpacked wrong.",
        "checklistText": "Run every Lab 1 Ex1 cell in order, checking the debugging-triage note first whenever something breaks."
      },
      {
        "label": "Run: Lab 1 Ex2 notebook, then record the dataset",
        "kind": "do",
        "minutes": 35,
        "resourceIds": [
          "aml-session-1-lab-1-ex2-notebook"
        ],
        "noteIds": [
          "s1-shopper-dataset",
          "s1-class-imbalance",
          "s1-tabular-shape"
        ],
        "instruction": "Run Ex2 clean. Using s1-shopper-dataset as the answer key, record: dataset shape, the target column (Revenue), and the class balance — s1-class-imbalance says exactly what \"checking class balance\" means and why (this sets up the metrics work in card-062 later).",
        "checklistText": "Run Ex2 clean, then record the shopper dataset's shape, target column Revenue, and class balance."
      },
      {
        "label": "Write: label every cell with its workflow stage",
        "kind": "write",
        "minutes": 20,
        "noteIds": [
          "s1-lab-five-steps"
        ],
        "instruction": "Go back through both notebooks and write one line per cell (or cell group): which of the 5 stages it belongs to. s1-lab-five-steps gives the lab's own wording of the process, so your labels match how the exam will describe it.",
        "checklistText": "Go back through both notebooks and label every cell group with its matching 5-stage workflow step."
      },
      {
        "label": "Self-test: sanity checklist",
        "kind": "test",
        "minutes": 5,
        "noteIds": [
          "s1-sanity-checklist"
        ],
        "instruction": "Run the 60-second sanity checklist against what you just built, and confirm every term flagged in card-001 is now resolved. Anything still shaky goes on your S1 error log, not into silence.",
        "checklistText": "Run the 60-second sanity checklist and confirm every term flagged back in card-001 is now resolved."
      }
    ]
  },
  'card-002': {
    "concepts": [
      "Lecture 1 task map: smoothing/decomposition, fitting, forecasting, and simulation",
      "SMA / centred MA / weighted MA / simple exponential smoothing — formula and when to use each",
      "Holt-Winters: the three update equations (level, trend, season)",
      "Additive vs multiplicative decomposition, one line each"
    ],
    "steps": [
      {
        "label": "Map L1, then work the core L2 examples",
        "kind": "do",
        "minutes": 50,
        "resourceIds": [
          "timeSeries-study-packs-pack-a-l1-l2-intro-and-smoothing",
          "timeSeries-lecture-notes-lecture-1-learning-material-notes",
          "timeSeries-lecture-notes-lecture-2-learning-material-notes"
        ],
        "noteIds": [
          "ts-l1-overview"
        ],
        "instruction": "Read the L1 overview note and the lecture's syllabus/task slides first; L1 is an orientation lecture, so do not hunt for calculations that are not there. Then cover the L2 numerical core: redo the SMA and centred-MA examples on {3,7,2,5,4,8,6} before checking, and trace how SES and Holt-Winters extend the smoothing idea.",
        "checklistText": "Write the L1 task map, then redo the L2 SMA and centred-MA examples before checking the lecture."
      },
      {
        "label": "Consolidate: smoothing, Holt-Winters, and decomposition",
        "kind": "read",
        "minutes": 40,
        "noteIds": [
          "ts-l1-overview",
          "ts-smoothing",
          "ts-holt-winters"
        ],
        "instruction": "Build TS_PackA_method_map.md: first map smooth/decompose, fit, forecast and simulate to their purpose; then compare your L2 numbers against ts-smoothing and write one line on where SMA/SES, CMA/WMA and Holt-Winters apply. Finish with additive versus multiplicative seasonality and the three Holt-Winters state updates.",
        "checklistText": "Build the Pack A method map and add one lecture-faithful use rule for each smoothing method."
      },
      {
        "label": "Flag the shakiest 1–2 steps",
        "kind": "test",
        "minutes": 15,
        "instruction": "Name the 1–2 steps from today that took longest or felt most guessed, in writing. This list is exactly what card-006's recall prompts and self-test should target first.",
        "checklistText": "Write down the 1-2 steps that took longest or felt most guessed today, for card-006 to target."
      }
    ]
  },
  'card-006': {
    "concepts": [
      "One-page method/formula sheet: L1 task map, SMA/CMA/WMA/SES, Holt-Winters, decomposition",
      "10 closed-book recall prompts spanning method choice, smoothing, and decomposition",
      "Self-test scored, weak topics flagged for Pack B"
    ],
    "steps": [
      {
        "label": "Compress: build the one-page method/formula sheet",
        "kind": "write",
        "minutes": 55,
        "noteIds": [
          "ts-l1-overview",
          "ts-smoothing",
          "ts-holt-winters"
        ],
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet",
          "timeSeries-quick-reference-r-comprehensive-cheat-sheet"
        ],
        "instruction": "Using the three Pack A notes, make one page with two zones: (1) the L1 decision map — smooth/decompose, fit, forecast, simulate; (2) the L2 formulas and use rules — SMA/CMA/WMA/SES, the three Holt-Winters updates, additive versus multiplicative. Cross-check the R calls only after the conceptual page is complete.",
        "checklistText": "Compress the L1 decision map and L2 smoothing formulas/use rules onto one page, then cross-check the R calls."
      },
      {
        "label": "Write: 10 closed-book recall prompts",
        "kind": "write",
        "minutes": 25,
        "instruction": "Write 10 prompts spanning task choice, smoothing and decomposition — start from the check-yourself questions in ts-l1-overview, ts-smoothing and ts-holt-winters, then add prompts that force a method choice from a short series description.",
        "checklistText": "Write 10 prompts spanning task choice, formulas, method use, and additive-versus-multiplicative seasonality."
      },
      {
        "label": "Self-test, mark, and flag",
        "kind": "test",
        "minutes": 25,
        "instruction": "Sit the 10 prompts closed-book, mark against your sheet, and score it. Anything under 8/10 by topic gets named explicitly and carried forward — Pack B (card-009/010) is next, and a named weak topic here is one less surprise at the mock.",
        "checklistText": "Sit your 10 prompts closed-book, mark them against your sheet, and name any topic scoring under 8/10."
      }
    ]
  },
  'card-007': {
    "concepts": [
      "The full preprocessing order applied end-to-end on two real datasets: clean placeholder-missing values -> impute -> encode -> scale -> split",
      "Spotting missing-value placeholders that isna() cannot see (crx's '?' markers hiding inside object-typed numeric columns)"
    ],
    "steps": [
      {
        "label": "Do: run Lab 2 clean on Titanic + crx",
        "kind": "do",
        "minutes": 35,
        "instruction": "Run top-to-bottom on Titanic first (quick), then crx. crx's A2/A14 will load as dtype object because of '?' placeholders — replace with np.nan and cast to float per the cleaning note before continuing. Don't stop to fully fix every error yet, just get both datasets executing.",
        "resourceIds": [
          "aml-session-2-lab-2-preprocessing-notebook"
        ],
        "noteIds": [
          "s2-crx-cleaning",
          "s2-trap-placeholder-missing"
        ],
        "checklistText": "Run Lab 2 on Titanic first, then crx — replace crx's '?' placeholders in A2/A14 with np.nan."
      },
      {
        "label": "Write: ordered preprocessing inventory",
        "kind": "write",
        "minutes": 25,
        "instruction": "For each dataset, list every preprocessing operation in the exact order it ran, and tag each column touched as imputed / encoded / scaled. Use the ColumnTransformer note to see how the categorical and numeric branches fork by dtype.",
        "noteIds": [
          "s2-missing-four-strategies",
          "s2-encoding-onehot",
          "s2-columntransformer"
        ],
        "checklistText": "List every preprocessing operation per dataset in the order it ran, tagging each column as imputed, encoded, or scaled."
      },
      {
        "label": "Self-check: verify order, save notebook",
        "kind": "test",
        "minutes": 15,
        "instruction": "Check your inventory's order against the two debugging notes (split before fitting anything; impute before scale). Diff any mismatch against the solution notebook, fix it, then save the executed notebook as your evidence.",
        "resourceIds": [
          "aml-session-2-lab-2-solution-notebook"
        ],
        "noteIds": [
          "s2-trap-encode-before-split",
          "s2-trap-scaling-choice"
        ],
        "checklistText": "Check your ordering against the split-before-fit rule, diff mismatches against the solution notebook, then save."
      }
    ]
  },
  'card-008': {
    "concepts": [
      "Why features need scaling, which model families require it (distance-based, gradient-descent, regularised) and which don't (trees)",
      "The two leakage sneak-in routes — fitting a transformer on the full dataset before splitting, and preprocessing outside a Pipeline so it re-fits silently during CV/GridSearchCV — and the Pipeline fix"
    ],
    "steps": [
      {
        "label": "Watch: sklearn Pipelines — the leakage fix",
        "kind": "watch",
        "minutes": 12,
        "instruction": "Watch UBC 5.3 once through. This is the video that shows Pipeline.fit/transform as the mechanical reason leakage becomes structurally impossible — the concept your playbook's leakage section rests on.",
        "resourceIds": [
          "aml-video-ubc-5-3-sklearn-pipelines"
        ],
        "checklistText": "Watch UBC 5.3 once for how Pipeline.fit/transform makes data leakage structurally impossible."
      },
      {
        "label": "Read: scaling rule + which models need it",
        "kind": "read",
        "minutes": 15,
        "instruction": "Read both notes. Extract: the three reasons to scale, which model families require it vs which don't (trees), and when to pick min-max vs z-score.",
        "noteIds": [
          "s2-why-scale",
          "s2-minmax-zscore"
        ],
        "checklistText": "Read both scaling notes and extract the three reasons to scale plus which model families need it."
      },
      {
        "label": "Read: leakage traps — the two sneak-in routes",
        "kind": "read",
        "minutes": 15,
        "instruction": "Read both. Note the two routes: (1) fitting any transformer — scaler, imputer, encoder, PCA — on the full dataset before splitting, and (2) running manual preprocessing outside a Pipeline so it silently re-fits during cross-validation/GridSearchCV.",
        "noteIds": [
          "s2-trap-encode-before-split",
          "s2-columntransformer"
        ],
        "checklistText": "Read both leakage notes and note the two sneak-in routes: pre-split fitting and manual out-of-pipeline preprocessing."
      },
      {
        "label": "Write: assemble the one-page playbook",
        "kind": "write",
        "minutes": 50,
        "instruction": "Produce AML_S2_preprocessing_playbook.md as one page under five headers: missing -> encode -> scale -> split -> leakage. Under each: the rule in one line plus the sklearn class or pattern. The leakage header states the two sneak-in routes and the Pipeline fix.",
        "noteIds": [
          "s2-missing-four-strategies",
          "s2-encoding-picker",
          "s2-columntransformer"
        ],
        "checklistText": "Write AML_S2_preprocessing_playbook.md with one rule line and sklearn pattern under each of the five headers."
      },
      {
        "label": "Dry-run: apply the playbook to crx from memory",
        "kind": "test",
        "minutes": 28,
        "instruction": "Closed-book, no notebook: talk through crx column by column (A1-A15, Target) stating what each playbook header would do to it, in order missing -> encode -> scale -> split -> leakage. Flag any column you can't classify cold and go fix your playbook, not the slides.",
        "checklistText": "Talk through crx column by column from memory, stating what your playbook does to each one, in order."
      }
    ]
  },
  'card-011': {
    "concepts": [
      "Linear regression as minimising OLS squared-error loss; the linear model form (w^Tx + b)",
      "The fundamental tradeoff: overfitting vs underfitting, defined by training error and the train-test gap",
      "Regularisation: ridge (L2) vs lasso (L1) vs elastic net, and when to prefer each",
      "Why a cross-validated score is trusted over a test score you tuned against"
    ],
    "steps": [
      {
        "label": "Watch: UBC 7.1 linear regression + 3.1/3.4 generalisation & tradeoff",
        "kind": "watch",
        "minutes": 48,
        "instruction": "Watch back to back for vocabulary and the shape of the fundamental tradeoff. Don't stop to take notes — the slides + notes step right after covers the detail.",
        "resourceIds": [
          "aml-video-ubc-7-1-linear-regression",
          "aml-video-ubc-3-1-generalization",
          "aml-video-ubc-3-4-fundamental-tradeoff"
        ],
        "checklistText": "Watch UBC 7.1, 3.1, and 3.4 back-to-back for the shape of the fundamental tradeoff, no notes yet."
      },
      {
        "label": "Read: S3 slides — linear model form and the loss",
        "kind": "read",
        "minutes": 20,
        "instruction": "Skim the slides once for the linear-model form and OLS. Use the two notes to pin the exact loss formula and the four names for it (objective/loss/cost/error function).",
        "resourceIds": [
          "aml-session-3-s3-regression-and-evaluation-slides"
        ],
        "noteIds": [
          "s3-linear-model",
          "s3-ols"
        ],
        "checklistText": "Skim the S3 slides once, then use the notes to pin the exact loss formula and its four names."
      },
      {
        "label": "Write: AML_S3_regression_concepts.md",
        "kind": "write",
        "minutes": 40,
        "instruction": "Closed-book: define overfitting/underfitting via the two-ability framing (training error / gap), state the regularisation definition precisely, contrast ridge vs lasso penalties and their effect on weights, note k-fold cross-validation (k=10 default), and log the metric table (MSE/RMSE/MAE/MAPE) with when to use each.",
        "noteIds": [
          "s3-generalisation",
          "s3-regularisation",
          "s3-ridge-lasso-elastic",
          "s3-assessment-methods",
          "s3-regression-metrics"
        ],
        "checklistText": "Write AML_S3_regression_concepts.md closed-book, covering overfitting, regularisation, ridge vs lasso, cross-validation, and the metrics table."
      },
      {
        "label": "Self-test: why trust the CV score",
        "kind": "test",
        "minutes": 12,
        "instruction": "Closed-book, one sentence: why a cross-validated/validation score is trustworthy while a test score you've tuned against is not. Check your line against the note only after writing it.",
        "noteIds": [
          "s3-trap-test-set-tuning"
        ],
        "checklistText": "Write one closed-book sentence on why a cross-validated score is trustworthy but a tuned test score isn't."
      }
    ]
  },
  'card-014': {
    "concepts": [
      "Running the Lab 3 fit/predict/score pipeline end-to-end without manual patches",
      "Ridge vs lasso coefficient behaviour in practice (shrink toward zero vs exact zero)",
      "Reading a train-vs-CV score gap as evidence of overfitting/underfitting"
    ],
    "steps": [
      {
        "label": "Do: run Lab 3 end-to-end clean",
        "kind": "do",
        "minutes": 40,
        "instruction": "Restart the kernel and run every cell in order: split, OLS fit, ridge/lasso fits, predict, score. Don't skip cells even if they look redundant — the point is reproducing the whole pipeline clean.",
        "resourceIds": [
          "aml-session-3-lab-3-linear-models-notebook"
        ],
        "checklistText": "Restart the kernel and run every Lab 3 cell in order without skipping any, from split through scoring."
      },
      {
        "label": "Write: tie results to your S3 concepts",
        "kind": "write",
        "minutes": 35,
        "instruction": "In a markdown cell (or a linked note): compare the ridge vs lasso coefficients you actually got against the shrink-vs-zero-out behaviour, then record your train score vs cross-validation score and explain any gap using the training-error/gap framing.",
        "noteIds": [
          "s3-ridge-lasso-elastic",
          "s3-which-regression",
          "s3-generalisation"
        ],
        "checklistText": "Compare your actual ridge vs lasso coefficients to the shrink-vs-zero-out idea, then explain the train/CV score gap."
      },
      {
        "label": "Save: restart & run all, save executed notebook",
        "kind": "do",
        "minutes": 15,
        "instruction": "Restart & Run All once more to confirm every cell reproduces with no manual fixes, then save the executed .ipynb as your evidence file.",
        "checklistText": "Restart & Run All one final time and save the fully executed notebook as your evidence file."
      }
    ]
  },
  'card-016': {
    "concepts": [
      "Reconstructing the Lab 3 model + evaluation cells from memory under time pressure",
      "MAE/MSE/R^2 and regression metric choice; confusion matrix, precision/recall, and the accuracy-on-imbalance trap",
      "Naming exactly which pieces failed to reproduce, as a targeted revision list"
    ],
    "steps": [
      {
        "label": "Timed: rebuild Lab 3 model + evaluation cells from blank",
        "kind": "do",
        "minutes": 25,
        "instruction": "Set a 20-25 min timer. From a blank notebook, rebuild the Lab 3 pipeline from memory: split, fit OLS + a regularised model, predict, score. Stop when the timer ends regardless of completion — the gaps are the data for step 3.",
        "checklistText": "Set a 20-25 minute timer and rebuild the Lab 3 split-fit-predict-score pipeline from memory, stopping when time's up."
      },
      {
        "label": "Recite: regression + classification evaluation metrics",
        "kind": "test",
        "minutes": 25,
        "instruction": "Closed-book, out loud or on paper: MAE/MSE/R^2 and when each is preferred; then the confusion-matrix cells, precision vs recall, and the 99.9%-accuracy trap. Check each against the note only after answering.",
        "noteIds": [
          "s3-regression-metrics",
          "s3-confusion-matrix",
          "s3-precision-recall-f",
          "s3-accuracy-limitation"
        ],
        "checklistText": "Recite MAE/MSE/R^2 and the confusion-matrix precision/recall trade-offs closed-book, then check each against the notes."
      },
      {
        "label": "Write: reconstruction gap log",
        "kind": "write",
        "minutes": 10,
        "instruction": "List exactly which cells or metrics you couldn't reproduce from memory and why (formula forgotten vs sklearn API forgotten vs logic gap) — this is your evidence and next revision's target list.",
        "checklistText": "List exactly which cells or metrics you couldn't rebuild from memory and whether it was a formula, API, or logic gap."
      }
    ]
  },
  'card-017': {
    "concepts": [
      "Four classifier families (logistic regression, kNN, decision trees, SVM/RBF) and when each is appropriate",
      "Confusion matrix and precision/recall/F1 definitions",
      "Comparison-table shape: idea, when to use, key hyperparameter per classifier"
    ],
    "steps": [
      {
        "label": "Watch: the four classifier clips",
        "kind": "watch",
        "minutes": 54,
        "instruction": "Watch back to back. For each, note only: the core idea in one line, and the one hyperparameter you'd tune first.",
        "resourceIds": [
          "aml-video-ubc-7-2-logistic-regression",
          "aml-video-ubc-4-2-knn",
          "aml-video-ubc-2-3-decision-trees",
          "aml-video-ubc-4-4-svm-rbf"
        ],
        "checklistText": "Watch the logistic regression, kNN, decision tree, and RBF SVM clips back to back, noting one key hyperparameter for each."
      },
      {
        "label": "Watch: confusion matrix + precision/recall/F1",
        "kind": "watch",
        "minutes": 17,
        "instruction": "These two are the source for the metrics definitions — no written note covers them. Write the confusion-matrix layout (TP/FP/FN/TN) and the precision/recall/F1 formulas as you watch.",
        "resourceIds": [
          "aml-video-ubc-9-2-confusion-matrix",
          "aml-video-ubc-9-3-precision-recall-f1"
        ],
        "checklistText": "Watch UBC 9.2 and 9.3 and write out the confusion-matrix layout plus the precision/recall/F1 formulas as you go."
      },
      {
        "label": "Read: S4 slides + classifier-picker cheatsheet",
        "kind": "read",
        "minutes": 15,
        "instruction": "Skim the slides once for the summary verdicts, then lock in the appropriateness call (training/prediction cost, scaling, interpretability) from the cheatsheet table.",
        "resourceIds": [
          "aml-session-4-s4-classification-slides"
        ],
        "noteIds": [
          "s4-classifier-picker"
        ],
        "checklistText": "Skim the S4 slides for verdicts, then lock in each classifier's cost/scaling/interpretability trade-offs from the cheatsheet."
      },
      {
        "label": "Write: AML_S4_classification_concepts.md + comparison-table skeleton",
        "kind": "write",
        "minutes": 25,
        "instruction": "One short paragraph per classifier family (idea, when to use, key hyperparameter) plus the confusion-matrix/precision/recall/F1 definitions, closed-book from what you just watched/read. Draft the comparison-table skeleton with one row per classifier and blank score columns for Lab 4 to fill.",
        "checklistText": "Draft AML_S4_classification_concepts.md with one paragraph per classifier, then sketch the comparison-table skeleton for Lab 4."
      },
      {
        "label": "Self-test: cold recall",
        "kind": "test",
        "minutes": 9,
        "instruction": "Closed-book: which classifier needs no scaling? Which is a black box? State precision and recall from the confusion matrix without looking. Flag anything shaky for Lab 4.",
        "checklistText": "Closed-book, name which classifier skips scaling, which is a black box, and state precision/recall from memory."
      }
    ]
  },
  'card-020': {
    "concepts": [
      "Applying all four classifiers in Lab 4 and reading real scores",
      "How C and gamma reshape the RBF SVM boundary at the four (γ, C) corners",
      "Confusion matrix -> precision/recall/F1 computed from actual predictions"
    ],
    "steps": [
      {
        "label": "Run: Lab 4 end-to-end, clean",
        "kind": "do",
        "minutes": 35,
        "instruction": "Run every cell top to bottom without edits first. Where the grid-search cell runs, check its shape against the cheatsheet (search space, cv scheme, best_params_) — if it diverges, note why.",
        "resourceIds": [
          "aml-session-4-lab-4-classification-notebook"
        ],
        "noteIds": [
          "s4-gridsearch-code"
        ],
        "checklistText": "Run every Lab 4 cell top to bottom unedited, checking the grid-search shape against the cheatsheet as it runs."
      },
      {
        "label": "Do: vary SVM C and gamma, watch the boundary",
        "kind": "do",
        "minutes": 25,
        "instruction": "Re-run the RBF SVM cell manually at the four corners (γ ∈ {0.1, 5}, C ∈ {0.001, 1000}). For each, record whether the boundary is smooth or wiggly and match it to the cheatsheet's direction table.",
        "resourceIds": [
          "aml-session-4-lab-4-classification-notebook"
        ],
        "noteIds": [
          "s4-svm-gamma-c"
        ],
        "checklistText": "Re-run the RBF SVM cell at gamma 0.1/5 and C 0.001/1000, noting whether each boundary is smooth or wiggly."
      },
      {
        "label": "Write: fill the comparison table with real scores",
        "kind": "write",
        "minutes": 35,
        "instruction": "One row per classifier (logistic, kNN, DT, SVM) with the actual accuracy from your Lab 4 run, plus the key hyperparameter you tuned and its type (integer/real/categorical).",
        "resourceIds": [
          "aml-session-4-lab-4-classification-notebook"
        ],
        "noteIds": [
          "s4-hyperparameters-def"
        ],
        "checklistText": "Fill one table row per classifier with its actual Lab 4 accuracy and the hyperparameter type you tuned."
      },
      {
        "label": "Write: metrics from the lab + save notebook",
        "kind": "write",
        "minutes": 25,
        "instruction": "Pull the confusion matrix and precision/recall/F1 for at least one classifier straight from your Lab 4 predictions (don't recompute from scratch — read the lab's own output). Save the executed notebook with all outputs intact as evidence.",
        "resourceIds": [
          "aml-session-4-lab-4-classification-notebook"
        ],
        "checklistText": "Copy the confusion matrix and precision/recall/F1 straight from your Lab 4 output, then save the executed notebook."
      }
    ]
  },
  'card-022': {
    "concepts": [
      "Rebuilding classifier + evaluation code from memory under time pressure",
      "Confusion matrix -> precision/recall/F1/ROC chain, recited cold",
      "Naming personal gaps precisely enough to act on later"
    ],
    "steps": [
      {
        "label": "Timed: rebuild classifier + evaluation cells from blank",
        "kind": "do",
        "minutes": 35,
        "instruction": "Closed notebook, closed notes. Set a 35-minute timer and rebuild from a blank file: fit at least two classifiers (e.g. SVM + one other), run a small grid search, and produce predictions — no peeking at Lab 4.",
        "checklistText": "In 35 minutes, closed-book, fit two classifiers plus a small grid search and produce predictions with no Lab 4 peeking."
      },
      {
        "label": "Recite: confusion matrix -> precision/recall/F1/ROC",
        "kind": "test",
        "minutes": 15,
        "instruction": "Out loud or on paper, closed-book: define the confusion matrix cells, then derive precision, recall, F1, and describe what the ROC curve plots — no references.",
        "checklistText": "Closed-book, derive precision, recall, and F1 from the confusion-matrix cells, then describe what the ROC curve plots."
      },
      {
        "label": "Write: gap log",
        "kind": "write",
        "minutes": 10,
        "instruction": "List exactly which cell, formula, or definition you hesitated on or got wrong. This is the input to tomorrow's catch-up, not a general reflection.",
        "checklistText": "Write down every cell, formula, or definition you hesitated on or got wrong, for tomorrow's catch-up session."
      }
    ]
  },
  'card-024': {
    "concepts": [
      "Why ensembles help: independent, better-than-random errors cancel out (No Free Lunch); four ways to diversify learners",
      "Bagging vs boosting vs stacking: what each manipulates, how they combine predictions, and what each mainly reduces"
    ],
    "steps": [
      {
        "label": "Watch: ensembles motivation + gradient boosted trees",
        "kind": "watch",
        "minutes": 18,
        "instruction": "Watch back to back. Just get the shape of the argument: why combining independent, better-than-random models cancels error, and how gradient boosted trees differ from a vote (they sum residual-fitting trees).",
        "resourceIds": [
          "aml-video-ubc-11-1-ensembles-motivation",
          "aml-video-ubc-11-2-gradient-boosted-trees"
        ],
        "checklistText": "Watch UBC 11.1 and 11.2 back to back and note why combining independent models beats a single one."
      },
      {
        "label": "Read: S5 slides + why combining helps",
        "kind": "read",
        "minutes": 32,
        "instruction": "Skim the slides once for structure, then lean on the three notes for the actual argument: what an ensemble is, the two conditions (independent + better than random) that make combining work, and the four ways to manufacture diversity.",
        "resourceIds": [
          "aml-session-5-s5-ensemble-slides"
        ],
        "noteIds": [
          "s5-what-is-ensemble",
          "s5-no-free-lunch",
          "s5-diversity"
        ],
        "checklistText": "Skim the S5 slides, then read the three notes for the two conditions that make ensembling work and the four diversity tricks."
      },
      {
        "label": "Watch: interpretation + feature importance",
        "kind": "watch",
        "minutes": 16,
        "instruction": "Watch back to back. Note what feature importance actually measures (impurity reduction across trees) so you can name a misleading case next.",
        "resourceIds": [
          "aml-video-ubc-12-1-interpretation-motivation",
          "aml-video-ubc-12-2-feature-importances"
        ],
        "checklistText": "Watch UBC 12.1 and 12.2, noting that feature importance measures impurity reduction across trees."
      },
      {
        "label": "Write: bagging vs boosting vs stacking table",
        "kind": "write",
        "minutes": 35,
        "instruction": "Draft your own table first (data manipulation, training order, base-learner strength, combination rule, what's mainly reduced) from the four concept notes, then check it against s5-ensemble-comparison and fix any row you got wrong.",
        "noteIds": [
          "s5-bagging",
          "s5-boosting",
          "s5-gradient-boosting",
          "s5-stacking",
          "s5-ensemble-comparison"
        ],
        "checklistText": "Draft your own bagging/boosting/stacking comparison table from memory, then correct it against s5-ensemble-comparison."
      },
      {
        "label": "Write: feature importance + a misleading case",
        "kind": "write",
        "minutes": 19,
        "instruction": "In your own words: state what feature_importances_ measures, then give one concrete case where it misleads (e.g. two correlated features split the credit so both look weaker than the single underlying signal really is). Save both pieces into AML_S5_ensembles_concepts.md.",
        "checklistText": "In AML_S5_ensembles_concepts.md, define feature_importances_ and give one concrete case where correlated features mislead it."
      }
    ]
  },
  'card-026': {
    "concepts": [
      "Random forest = bagging + random feature subset per split; OOB gives a free validation estimate (~37% held out per tree)",
      "RF votes/averages over independent trees; GBRT sums trees fit to the previous residual — different mechanisms, compare scores directly"
    ],
    "steps": [
      {
        "label": "Do: run Lab 5 end-to-end",
        "kind": "do",
        "minutes": 30,
        "instruction": "Run every cell top to bottom without stopping to tinker. If a cell errors, check the matching code cheatsheet (voting classifier / bagging / random forest / AdaBoost & GBRT) before debugging from scratch.",
        "resourceIds": [
          "aml-session-5-lab-5-ensemble-notebook"
        ],
        "noteIds": [
          "s5-voting-code",
          "s5-bagging-code",
          "s5-rf-code",
          "s5-adaboost-code"
        ],
        "checklistText": "Run every Lab 5 cell top to bottom without tinkering, checking the matching cheatsheet before debugging any error."
      },
      {
        "label": "Write: RF vs GBRT scores + OOB",
        "kind": "write",
        "minutes": 15,
        "instruction": "Pull the random forest and gradient-boosting test accuracies straight from the executed notebook. Record the OOB score next to the true test score and note how close they land — that gap (or lack of one) is the whole point of OOB.",
        "noteIds": [
          "s5-random-forest",
          "s5-oob"
        ],
        "checklistText": "Record the random forest and GBRT test accuracies plus the OOB score, noting how closely OOB tracks the true test score."
      },
      {
        "label": "Write: finalise ensemble table + save notebook",
        "kind": "write",
        "minutes": 15,
        "instruction": "Fold the RF/GBRT scores, OOB result, and top 2-3 feature importances into the bagging/boosting/stacking table from card-024. Save the executed notebook as your evidence file.",
        "noteIds": [
          "s5-rf-code"
        ],
        "checklistText": "Add the RF/GBRT scores, OOB result, and top feature importances into the card-024 table, then save the executed notebook."
      }
    ]
  },
  'card-027': {
    "concepts": [
      "Reconstructing bagging/random-forest/boosting fit+evaluate code cold, under time pressure",
      "Bagging vs boosting vs stacking distinctions, recalled without notes"
    ],
    "steps": [
      {
        "label": "Do: timed rebuild of fit+evaluate cells",
        "kind": "do",
        "minutes": 40,
        "instruction": "Closed notebook, closed notes. From a blank file, rebuild the BaggingClassifier/RandomForestClassifier and AdaBoost-or-GBRT fit+evaluate cells and get them running end to end. Time yourself; note exactly where you stalled.",
        "checklistText": "Closed-book, rebuild the bagging/random-forest and AdaBoost-or-GBRT fit-and-evaluate cells from a blank notebook, timing yourself."
      },
      {
        "label": "Self-test: recite bagging/boosting/stacking",
        "kind": "test",
        "minutes": 20,
        "instruction": "Closed-book: say or write the data-manipulation, training-order, base-learner-strength, and combination-rule differences for bagging, boosting, and stacking. Only check your own table afterward.",
        "checklistText": "Closed-book, state the data-manipulation, training-order, and combination-rule differences for bagging, boosting, and stacking."
      },
      {
        "label": "Write: gaps for Phase 1",
        "kind": "write",
        "minutes": 15,
        "instruction": "List every stumble from the last two steps (a forgotten argument, a confused distinction, an OOB or feature-importance detail) as a dated Phase 1 revision entry. This closes out AML first pass S1-S5.",
        "checklistText": "Log every stumble from the last two steps as a dated Phase 1 revision entry to close out AML sessions 1-5."
      }
    ]
  },
  'card-033': {
    "concepts": [
      "Full S1–S5 topic-to-location map: every method pinned to its exact sheet/lab/page",
      "Open-book speed discipline: index before content, one-line answer templates"
    ],
    "steps": [
      {
        "label": "Read: exam-shape + method-picker overview",
        "kind": "read",
        "minutes": 20,
        "instruction": "Two fast re-reads only: what the exam actually tests, and the full cross-session method roster. This fixes the topic list before you start locating pages — don't take new notes.",
        "noteIds": [
          "s1-module-shape",
          "s5-method-picker"
        ],
        "checklistText": "Re-read the module-shape note and the method-picker note once each, taking no new notes."
      },
      {
        "label": "Write: topic -> location index (S1–S5)",
        "kind": "write",
        "minutes": 55,
        "instruction": "Build AML_openbook_index.md as a table: one row per method/topic across S1–S5, columns = topic | sheet/slide/page | lab/notebook | status. Work session by session from your own S1–S32 evidence — you're locating material, not re-deriving it.",
        "checklistText": "Build AML_openbook_index.md with one row per topic and columns for sheet, lab, and status, session by session."
      },
      {
        "label": "Tab/colour the pack",
        "kind": "do",
        "minutes": 15,
        "instruction": "Apply physical or PDF-bookmark tabs by session/colour so every topic row in the index maps to a flip-to-it-in-seconds tab.",
        "checklistText": "Add colour-coded tabs or PDF bookmarks per session so each index row flips open in seconds."
      },
      {
        "label": "Write: 'how to answer' lines + flag gaps",
        "kind": "write",
        "minutes": 30,
        "instruction": "Add one line per topic: the opening sentence you'd write in an exam answer. Where you can't produce one yet, mark the row as a gap for a later pass instead of guessing.",
        "checklistText": "Draft one opening exam-answer sentence per topic row, flagging any you can't yet write as a gap."
      }
    ]
  },
  'card-036': {
    "concepts": [
      "Model-selection logic: matching model family to data/target shape across S3–S5",
      "Evaluation logic: matching metric to task, class balance, and validation method"
    ],
    "steps": [
      {
        "label": "Read: model-selection cheatsheets (S3–S5)",
        "kind": "read",
        "minutes": 25,
        "instruction": "Cross-check your own model-selection instincts against these four cross-session pickers: the regression family, S4's three classifiers, the full method roster, and bagging/boosting/stacking.",
        "noteIds": [
          "s3-which-regression",
          "s4-classifier-picker",
          "s5-method-picker",
          "s5-ensemble-comparison"
        ],
        "checklistText": "Cross-check your model picks against the regression, classifier, method-roster, and bagging/boosting/stacking cheatsheets."
      },
      {
        "label": "Write: AML_model_selection.md",
        "kind": "write",
        "minutes": 30,
        "instruction": "Checklist: rows = data/target shape (continuous, binary, multi-class, high-dim, small-n, needs-interpretability), columns = recommended model(s) + one-line why.",
        "checklistText": "List each data shape (continuous, binary, multi-class, high-dim, small-n) with its recommended model and a one-line reason."
      },
      {
        "label": "Read: evaluation cheatsheets (S3, S5)",
        "kind": "read",
        "minutes": 20,
        "instruction": "Fast pass for metric -> use-case mapping plus the assessment methods (holdout/CV/OOB) — you already know this, you're compressing it onto one page, not relearning it.",
        "noteIds": [
          "s3-regression-metrics",
          "s3-confusion-matrix",
          "s3-precision-recall-f",
          "s3-roc-auc",
          "s3-assessment-methods",
          "s5-oob"
        ],
        "checklistText": "Skim the metric-to-use-case notes plus holdout, cross-validation, and OOB to compress them onto one page."
      },
      {
        "label": "Write: AML_evaluation.md + decision tree",
        "kind": "write",
        "minutes": 40,
        "instruction": "Metric -> when-to-use table (regression, classification, imbalance), then a single decision-tree diagram: task type -> metric -> 'what do I do next' if the result looks bad.",
        "checklistText": "Draft the metric-use table, then sketch a decision tree: task type to metric to next step if results look bad."
      },
      {
        "label": "Add both to the pack",
        "kind": "do",
        "minutes": 5,
        "instruction": "File under Models/Evaluation tabs and cross-link both pages from the card-033 master index.",
        "checklistText": "File both pages under the Models and Evaluation tabs and link them from the master topic index."
      }
    ]
  },
  'card-039': {
    "concepts": [
      "Tuning checklist: grid vs random search vs CV, what to tune per model family",
      "The three recurring exam traps: leakage, scaling-before-split, wrong metric"
    ],
    "steps": [
      {
        "label": "Read: tuning cheatsheets (S4)",
        "kind": "read",
        "minutes": 20,
        "instruction": "Refresh parameters-vs-hyperparameters, grid vs random search, and reading gamma/C on an RBF SVM.",
        "noteIds": [
          "s4-hyperparameters-def",
          "s4-grid-vs-random",
          "s4-gridsearch-code",
          "s4-svm-gamma-c"
        ],
        "checklistText": "Refresh parameters vs hyperparameters, grid vs random search, and reading gamma and C on an RBF SVM."
      },
      {
        "label": "Write: AML_tuning.md",
        "kind": "write",
        "minutes": 30,
        "instruction": "Checklist: grid vs random vs CV decision rule up top, then one row per model family (kNN, SVM, tree, ensemble) for what to tune and typical ranges.",
        "checklistText": "Write the grid-vs-random-vs-CV decision rule, then one row per model family listing what to tune and typical ranges."
      },
      {
        "label": "Read: trap notes across S1–S4",
        "kind": "read",
        "minutes": 15,
        "instruction": "Six short traps covering the three named failure modes twice each (leakage, scaling-before-split, wrong metric). Re-read fast, don't take fresh notes.",
        "noteIds": [
          "s1-trap-scale-before-split",
          "s1-trap-fit-transform-test",
          "s2-trap-encode-before-split",
          "s3-trap-test-set-tuning",
          "s1-trap-accuracy-imbalance",
          "s3-trap-metric-choice"
        ],
        "checklistText": "Re-read all six trap notes on leakage, scaling-before-split, and wrong metrics without adding new notes."
      },
      {
        "label": "Write: AML_common_mistakes.md",
        "kind": "write",
        "minutes": 45,
        "instruction": "Three sections — leakage, scaling-before-split, wrong metric — one line per trap: what it looks like in code/output + the fix. Pull from the six trap notes plus anything else you remember.",
        "checklistText": "Write one line per trap across leakage, scaling-before-split, and wrong-metric sections: what it looks like and the fix."
      },
      {
        "label": "Add both to the pack",
        "kind": "do",
        "minutes": 10,
        "instruction": "File under Tuning/Traps tabs. Cross-link the wrong-metric traps from AML_evaluation.md and the leakage traps from AML_model_selection.md's preprocessing-heavy rows.",
        "checklistText": "File under Tuning and Traps tabs, then cross-link the wrong-metric and leakage rows to their matching pages."
      }
    ]
  },
  'card-041': {
    "concepts": [
      "Stress-testing the assembled open-book pack under time pressure on an unseen CSV"
    ],
    "steps": [
      {
        "label": "Dry-run: plan a fresh CSV from the pack only",
        "kind": "do",
        "minutes": 30,
        "instruction": "Grab a dataset you haven't used before (an old lab CSV or a new UCI/Kaggle sample). Using ONLY the pack — no notes, no videos, no internet — write the full plan: EDA -> preprocessing -> model choice -> evaluation -> tuning.",
        "checklistText": "Plan a full EDA-to-tuning pipeline for a brand-new dataset using only the pack, no notes or internet."
      },
      {
        "label": "Time every lookup",
        "kind": "test",
        "minutes": 15,
        "instruction": "While planning, stopwatch each flip-to-the-pack moment. Log a two-column table: page/section, seconds taken.",
        "checklistText": "Stopwatch every pack lookup during the dry run and log page/section against seconds taken."
      },
      {
        "label": "Fix slow or missing pages",
        "kind": "write",
        "minutes": 15,
        "instruction": "Anything over roughly 20 seconds or not found at all: fix it now — re-tab, add a missing index row, or shorten a page. Note the fix in the dry-run log.",
        "checklistText": "Re-tab, add, or shorten any page that took over 20 seconds to find or wasn't there at all."
      }
    ]
  },
  'card-046': {
    "concepts": [
      "Assembling a single ordered, navigable open-book pack from every session's checklist"
    ],
    "steps": [
      {
        "label": "Assemble + order the pack",
        "kind": "do",
        "minutes": 15,
        "instruction": "Merge every page built across cards 033/036/039 into one physical/PDF stack in order: workflow -> preprocessing -> models -> evaluation -> tuning -> traps.",
        "checklistText": "Merge all pages into one stack ordered workflow, preprocessing, models, evaluation, tuning, then traps."
      },
      {
        "label": "Master contents + final polish",
        "kind": "write",
        "minutes": 15,
        "instruction": "Write a one-page master contents: section -> tab colour -> page count. Remove duplicate rows and close out anything flagged in the card-041 dry-run log.",
        "checklistText": "Write a one-page contents list mapping section to tab colour and page count, then clear the dry-run's flagged fixes."
      }
    ]
  },
  'card-051': {
    "concepts": [
      "Open-book exam technique: navigate your own pack fast, don't relearn material",
      "Honest self-marking against worked solutions/lab outputs, not against intent"
    ],
    "steps": [
      {
        "label": "Do: sit AML mock #1 cold, timed, open-book",
        "kind": "do",
        "minutes": 100,
        "instruction": "Set a timer to your predetermined class-test length. Sit it cold: no rehearsal, no material beyond your own open-book pack (session summary sheets, index, checklists). No internet, no AI. The pack lookup speed is exactly what's being tested.",
        "checklistText": "Sit mock #1 cold under a full timer, using only your own open-book pack, no internet or AI."
      },
      {
        "label": "Mark: score against worked solutions",
        "kind": "test",
        "minutes": 45,
        "instruction": "Mark every answer honestly against the lab notebooks' real outputs and your worked solutions, not against what you meant to write. If you're unsure whether partial credit applies, mark it wrong.",
        "checklistText": "Mark every answer against the lab notebooks' actual outputs, scoring any uncertain partial credit as wrong."
      },
      {
        "label": "Write: log score + fumble list",
        "kind": "write",
        "minutes": 25,
        "instruction": "Log the raw score for mock #1. List every topic you fumbled, not only the worst ones — small slips matter, they show where the pack index is too slow to use under time pressure.",
        "checklistText": "Log the raw score and list every topic fumbled, including small slips, not only the worst ones."
      },
      {
        "label": "Write: repair card for the 3 worst fumbles",
        "kind": "write",
        "minutes": 25,
        "instruction": "Pick the 3 costliest fumbles by marks lost, not by embarrassment. Write each up as tomorrow's repair card: what went wrong, the correct approach, one drill question to retest it.",
        "checklistText": "Write up the 3 highest-mark-loss fumbles with what went wrong, the fix, and one retest drill question each."
      }
    ]
  },
  'card-056': {
    "concepts": [
      "S3 regression pipeline from blank: split, fit, predict, score (train vs CV)",
      "S4 classification pipeline from blank: fit, predict, confusion matrix, precision/recall/F1"
    ],
    "steps": [
      {
        "label": "Do: timed rebuild — Lab 3 train+evaluate",
        "kind": "do",
        "minutes": 65,
        "instruction": "Blank editor, timer on. Rebuild the Lab 3 regression pipeline from memory: split, fit, predict, score (train vs cross-validation). Do not open the solved notebook until time is up.",
        "checklistText": "Rebuild the Lab 3 regression pipeline from memory — split, fit, predict, score — without opening the solved notebook."
      },
      {
        "label": "Do: timed rebuild — Lab 4 classifier+metrics",
        "kind": "do",
        "minutes": 65,
        "instruction": "Same rules, fresh timer. Rebuild the Lab 4 classification pipeline from memory: fit, predict, confusion matrix, precision/recall/F1. No peeking until time's up.",
        "checklistText": "Rebuild the Lab 4 classifier from memory through fit, predict, confusion matrix, and precision/recall/F1."
      },
      {
        "label": "Write: repair list",
        "kind": "write",
        "minutes": 35,
        "instruction": "For both labs, list every cell you couldn't reproduce cleanly — wrong import, blanked-on syntax, wrong argument order. Be specific ('forgot stratify=y on the split'), not 'metrics were hard' — this feeds the next repair card.",
        "checklistText": "List every cell you couldn't reproduce cleanly with specifics, like 'forgot stratify=y on the split'."
      }
    ]
  },
  'card-059': {
    "concepts": [
      "S5 ensemble pipeline from blank: bagging/random-forest fit, predict, OOB/CV score",
      "Bagging vs boosting vs stacking: which to pick and why, justified from the problem"
    ],
    "steps": [
      {
        "label": "Do: timed rebuild — Lab 5 fit+evaluate",
        "kind": "do",
        "minutes": 70,
        "instruction": "Blank editor, timer on. Rebuild the Lab 5 ensemble pipeline from memory: bagging/random forest fit, predict, OOB or cross-validation score. No peeking until time's up.",
        "checklistText": "Rebuild the Lab 5 bagging or random forest pipeline from memory, then score it with OOB or cross-validation."
      },
      {
        "label": "Test: 3 'which ensemble & why' exam Qs",
        "kind": "test",
        "minutes": 55,
        "instruction": "Timed, closed-book: answer 3 exam-style 'which ensemble would you pick and why' questions. Justify from the data/problem — correlated base-learner errors, need for speed, need for interpretability — not just by naming an algorithm. Check your reasoning against the bagging/boosting/stacking comparison note only after answering.",
        "noteIds": [
          "s5-ensemble-comparison"
        ],
        "checklistText": "Answer 3 'which ensemble and why' questions closed-book, justifying from the data, then check against the comparison note."
      },
      {
        "label": "Write: repair list update",
        "kind": "write",
        "minutes": 40,
        "instruction": "Merge today's gaps — the rebuild and the ensemble questions — into the running repair list: what broke, the fix, one retest question for each.",
        "checklistText": "Merge today's rebuild and ensemble-question gaps into the repair list with a fix and retest question each."
      }
    ]
  },
  'card-062': {
    "concepts": [
      "Metric choice by situation: imbalance -> precision/recall/F1/AUC, not accuracy",
      "k-fold CV vs holdout vs leave-one-out, and why you report std alongside the mean",
      "The default-scoring trap: cross_val_score/GridSearchCV optimise accuracy unless told otherwise"
    ],
    "steps": [
      {
        "label": "Watch: metrics + class imbalance",
        "kind": "watch",
        "minutes": 23,
        "instruction": "Watch both back to back as a refresher, not first-learning: why metrics matter beyond accuracy (9.1), then how class imbalance breaks accuracy specifically (9.4).",
        "resourceIds": [
          "aml-video-ubc-9-1-metrics-motivation",
          "aml-video-ubc-9-4-class-imbalance"
        ],
        "checklistText": "Watch UBC 9.1 and 9.4 back to back as a refresher on why accuracy alone misleads under class imbalance."
      },
      {
        "label": "Read: metric choice, CV, imbalance notes",
        "kind": "read",
        "minutes": 20,
        "instruction": "Fast skim, revision only: confusion matrix layout, precision/recall/F1 formulas, the 99.9%-accuracy imbalance example and its remedies, holdout/CV/leave-one-out, and the metric-choice-by-situation trap table. One line per note if you already know it cold.",
        "noteIds": [
          "s3-confusion-matrix",
          "s3-precision-recall-f",
          "s3-accuracy-limitation",
          "s3-assessment-methods",
          "s3-trap-metric-choice"
        ],
        "checklistText": "Skim the five notes on confusion matrices, precision/recall/F1, CV methods, and the metric-choice trap table."
      },
      {
        "label": "Do: 8 timed exam Qs",
        "kind": "test",
        "minutes": 80,
        "instruction": "Set a timer. Answer 8 exam-style questions covering metric choice by situation, CV setup/choice of k, and imbalance handling, closed-book, from memory. Write full justifications, not just the metric name.",
        "checklistText": "Answer 8 timed, closed-book exam questions on metric choice, CV setup, and imbalance handling with full justifications."
      },
      {
        "label": "Mark against checklist",
        "kind": "test",
        "minutes": 20,
        "instruction": "Mark each answer against the correct reasoning, not just the right metric name: did you justify from the situation, name the CV method correctly, state the imbalance remedy?",
        "checklistText": "Mark each answer for correct reasoning: situation-based justification, correct CV method name, stated imbalance remedy."
      },
      {
        "label": "Write: rewrite shaky reasoning clean",
        "kind": "write",
        "minutes": 22,
        "instruction": "For every answer that was wrong, or right by luck, rewrite the justification cleanly in your own words — this is what should come out under real exam pressure.",
        "checklistText": "Rewrite the justification for every wrong or luck-right answer cleanly in your own words."
      }
    ]
  },
  'card-065': {
    "concepts": [
      "Open-book exam technique under repeat conditions: is the pack actually faster this time",
      "Comparing mock #2's fumbles against mock #1's to tell real gaps from bad luck"
    ],
    "steps": [
      {
        "label": "Do: sit AML mock #2 cold, timed, open-book",
        "kind": "do",
        "minutes": 100,
        "instruction": "Same conditions as mock #1: set a timer to your predetermined class-test length, sit it cold, open-book pack only, no internet, no AI.",
        "checklistText": "Sit AML mock #2 cold under timed, open-book-pack-only conditions with no internet and no AI."
      },
      {
        "label": "Mark: score against worked solutions",
        "kind": "test",
        "minutes": 45,
        "instruction": "Mark every answer honestly against the lab notebooks' real outputs and your worked solutions, not against what you meant to write.",
        "checklistText": "Mark every mock #2 answer against the lab notebooks' real outputs and your worked solutions."
      },
      {
        "label": "Write: score + fumble list vs mock #1",
        "kind": "write",
        "minutes": 25,
        "instruction": "Log the score for mock #2. List every fumble, then check it against mock #1's fumble list — flag any topic that fumbled twice; that's a real gap, not bad luck.",
        "checklistText": "Log mock #2's score and flag any topic that fumbled in both mocks as a real gap."
      },
      {
        "label": "Write: repair card for the 3 worst fumbles",
        "kind": "write",
        "minutes": 25,
        "instruction": "Pick the 3 costliest fumbles from this mock. If a topic repeats from mock #1's repair card, treat it as priority one — the earlier repair didn't stick.",
        "checklistText": "Write a repair card for the 3 costliest fumbles, prioritizing any that repeat from mock #1."
      }
    ]
  },
  'card-073': {
    "concepts": [
      "All major pack sections exercised by at least one rapid-fire prompt (traps, formulas/code recipes, metrics, workflow)",
      "Every lookup timed and logged as it happens, not estimated afterward",
      "Every lookup over ~20s re-tabbed so a repeat prompt resolves fast",
      "Any genuinely missing quick-reference entry added to the pack"
    ],
    "steps": [
      {
        "label": "Draft: 30 rapid-fire lookup prompts",
        "kind": "do",
        "minutes": 15,
        "instruction": "Write 30 short prompts spanning every pack section — traps, formulas/code recipes, metrics, workflow steps — so the stress test actually covers the whole pack instead of the parts you already know well. One line each, phrased the way a rushed exam question would ask it.",
        "checklistText": "Write 30 one-line lookup prompts covering every pack section, phrased like rushed exam questions."
      },
      {
        "label": "Drill: race the pack, timing every lookup",
        "kind": "test",
        "minutes": 55,
        "instruction": "Work through all 30 prompts back to back, stopwatch running, and write down the seconds for each lookup as you go. The raw timing log is the evidence — don't reconstruct it from memory after the fact.",
        "checklistText": "Race through all 30 prompts with a stopwatch, logging the seconds for each lookup as you go."
      },
      {
        "label": "Re-tab: fix everything slower than ~20s",
        "kind": "do",
        "minutes": 40,
        "instruction": "For every prompt that came in over ~20s, fix the access path itself — retitle a tab, move a section, add a header — rather than just noting it was slow. The bar is that the SAME prompt would resolve fast on a re-run, not that you now remember where it is.",
        "checklistText": "Retitle tabs, move sections, or add headers to fix every lookup that took longer than about 20 seconds."
      },
      {
        "label": "Write: add missing quick-reference entries",
        "kind": "write",
        "minutes": 25,
        "instruction": "For anything the stress test showed wasn't in the pack at all (not just slow to find), write the quick-reference entry now while the gap is fresh. Log it alongside the re-tab list — together they're the 'pack tweaks' this card asks for.",
        "checklistText": "Write quick-reference entries for anything the stress test showed was missing from the pack entirely."
      }
    ]
  },
  'card-076': {
    "concepts": [
      "Three trap families drilled: leakage (fitting before splitting), scaling (wrong thing scaled or omitted), and CV/tuning leakage (selecting on the test set / overfitting the validation set)",
      "A one-line fix articulated for each of the 10 spotted errors",
      "UBC 8.2: why repeated validation-set tuning overfits it even though it is never the test set",
      "Any newly found trap variant logged to the traps page"
    ],
    "steps": [
      {
        "label": "Watch: UBC 8.2 — Overfitting of the validation error",
        "kind": "watch",
        "minutes": 13,
        "instruction": "Watch for the mechanism only: how repeatedly tuning against the same validation split lets you overfit it, even though it is never the test set. This is the CV trap the drill below targets.",
        "resourceIds": [
          "aml-video-ubc-8-2-validation-overfitting"
        ],
        "checklistText": "Watch UBC 8.2 focusing on how repeated validation-split tuning quietly overfits the validation set."
      },
      {
        "label": "Read: leakage, scaling, and CV traps",
        "kind": "read",
        "minutes": 35,
        "instruction": "Read all five short trap notes back to back: two leakage variants (scale-before-split, fit_transform on the test set), two scaling variants (encode-before-split, scaling the wrong things), and the CV/tuning trap (selecting on the test set) the video just showed happens to the validation set too. Deliberately do NOT rewatch UBC 5.3 (pipelines) — that's card-008's video; revise leakage from these notes instead.",
        "noteIds": [
          "s1-trap-scale-before-split",
          "s1-trap-fit-transform-test",
          "s2-trap-encode-before-split",
          "s2-trap-scaling-choice",
          "s3-trap-test-set-tuning"
        ],
        "checklistText": "Read the five trap notes on leakage, scaling, and test-set tuning back to back, skipping UBC 5.3."
      },
      {
        "label": "Drill: 10 spot-the-error questions",
        "kind": "do",
        "minutes": 60,
        "instruction": "Write 10 short code/setup snippets, each containing exactly one of the three trap types (leakage, scaling, CV), spot the error in each, and write the one-line fix. Do this closed-book; use the five notes only afterward, as your answer key.",
        "checklistText": "Write 10 code snippets each hiding one leakage, scaling, or CV trap, then spot and fix each closed-book."
      },
      {
        "label": "Self-check + log any new trap",
        "kind": "test",
        "minutes": 27,
        "instruction": "Mark your 10 one-line fixes against the notes. If the drill surfaced any trap variant not already covered by the five notes, add it to your traps page now — that's the 'add any new trap to the page' checklist item, not an optional extra.",
        "checklistText": "Mark your 10 fixes against the trap notes and add any newly surfaced trap variant to the traps page."
      }
    ]
  },
  'card-080': {
    "concepts": [
      "Mock #3 sat cold under the real class-test format: 1.5h timed + 30min upload, open-book, no internet, no AI",
      "Every answer marked against worked solutions / lab outputs, not self-graded from memory",
      "Score logged and every fumbled topic named, including near-misses",
      "The 3 worst fumbles converted into concrete, resource-specific repair actions for the next day"
    ],
    "steps": [
      {
        "label": "Set up + sit Mock #3 cold",
        "kind": "do",
        "minutes": 120,
        "instruction": "Set a timer to the real format — 1.5h timed plus 30min upload, per s1-module-shape — and sit it cold: open-book using your pack only, no internet, no AI. Treat the upload window as part of the timed block, not slack time.",
        "noteIds": [
          "s1-module-shape"
        ],
        "checklistText": "Sit mock #3 cold in the real 1.5h-plus-30min-upload format, open-book pack only, no internet or AI."
      },
      {
        "label": "Mark honestly against worked solutions / lab outputs",
        "kind": "test",
        "minutes": 45,
        "instruction": "Mark every question against your own worked solutions and lab outputs, not from memory of what you meant to write. Give partial credit only where you would genuinely get it.",
        "checklistText": "Mark every mock #3 answer against your worked solutions and lab outputs, giving only genuinely earned partial credit."
      },
      {
        "label": "Log the score + list every fumbled topic",
        "kind": "write",
        "minutes": 25,
        "instruction": "Record the mock #3 score, then list every topic you fumbled — not just the ones that cost the most marks. A topic you scraped through on a lucky guess belongs on the list too.",
        "checklistText": "Record mock #3's score and list every fumbled topic, including lucky guesses that only scraped by."
      },
      {
        "label": "Convert the 3 worst fumbles into tomorrow's repair card",
        "kind": "write",
        "minutes": 35,
        "instruction": "Rank the fumbled list, take the worst 3, and write each as a concrete next-day repair action (what to re-drill, from which specific resource) rather than a vague topic name. This is what feeds directly into the repair card.",
        "checklistText": "Turn the worst 3 fumbles into concrete next-day repair actions naming the specific resource to re-drill."
      }
    ]
  },
  'card-088': {
    "concepts": [
      "Sit mock #4 to the real CMT307 class-test format: 90 min computer-based + 30 min upload, open-book, no internet, no AI",
      "A mock's value is the ranked fumble list it produces, not the raw score"
    ],
    "steps": [
      {
        "label": "Do: sit mock #4 cold, open-book only",
        "kind": "do",
        "minutes": 120,
        "instruction": "Set a timer to 90 minutes for the questions plus a 30 minute upload buffer — the exact CMT307 class-test format (s1-module-shape). Sit it cold: pack open throughout for navigation, but no notes read beforehand, no internet, no AI. Work s1-exam-strategy's rules as you go — run code before reading it, change one thing at a time, print shapes at boundaries, prefer the smallest fix — and keep the 30 min buffer for uploading only, never for one more idea.",
        "noteIds": [
          "s1-module-shape",
          "s1-exam-strategy"
        ],
        "checklistText": "Sit mock #4 cold in the 90min-plus-30min-upload format, applying s1-exam-strategy's run-code-first, one-change-at-a-time rules."
      },
      {
        "label": "Mark: score against worked solutions / lab outputs",
        "kind": "test",
        "minutes": 45,
        "instruction": "Mark every question against your own worked solutions and lab notebook outputs, not from memory or gut feel. Be strict — an answer that's directionally right but code-broken still counts wrong; that's the mistake the real test punishes hardest.",
        "checklistText": "Mark every mock #4 answer strictly against worked solutions and lab outputs: directionally right but broken code still counts wrong."
      },
      {
        "label": "Log: score + full fumble list",
        "kind": "write",
        "minutes": 20,
        "instruction": "Record mock #4's score. List every topic you fumbled — not just the ones that stick in memory — and rank the list by marks lost, worst first.",
        "checklistText": "Record mock #4's score and rank every fumbled topic by marks lost, worst first."
      },
      {
        "label": "Write: hand off the 3 worst fumbles",
        "kind": "write",
        "minutes": 10,
        "instruction": "Take the top 3 from the ranked list and write them as the opening line of tomorrow's repair card (card-091) — name the specific method or concept each one tests, not a vague topic area — so repair starts on diagnosis, not on re-reading the whole script.",
        "checklistText": "Write the top 3 ranked fumbles as the opening line of tomorrow's repair card, naming the specific method tested."
      }
    ]
  },
  'card-091': {
    "concepts": [
      "Weak-topic repair is a 4-step loop — diagnose from the error log, re-derive/re-run, closed-book re-test, then close — not general re-reading",
      "A topic only counts as fixed once it passes cold, closed-book; making sense open-book does not clear the error log"
    ],
    "steps": [
      {
        "label": "Diagnose: name the 3 weakest topics from mock #4",
        "kind": "do",
        "minutes": 15,
        "instruction": "Open the mock #4 script and error log side by side. For every wrong or blank answer, name the SPECIFIC method it tested (e.g. \"k-NN needs scaling\", not just \"classification\"). Rank by marks lost and pick the worst 3 — these are the only 3 this card touches.",
        "checklistText": "Go through the mock #4 script and error log, naming the specific method behind each wrong or blank answer."
      },
      {
        "label": "Repair: re-derive or re-run each of the 3",
        "kind": "do",
        "minutes": 60,
        "instruction": "For each of the 3, go straight to the matching page or lab cell in your pack. Either re-derive the method by hand (formula, worked numbers) or re-run the actual lab notebook cell until the output makes sense again. Budget 20 min each — if one still isn't clicking at 20 min, flag it and move on rather than burning the whole block on one topic.",
        "checklistText": "Re-derive by hand or re-run the lab notebook cell for each of the 3 topics, capping 20 minutes per topic."
      },
      {
        "label": "Re-test: closed-book, just these 3",
        "kind": "test",
        "minutes": 20,
        "instruction": "Close every resource — pack, notebook, slides. Answer one mock-style question per topic from memory only, then mark yourself against the pack afterward. No peeking mid-answer.",
        "checklistText": "Close every resource and answer one mock-style question per topic from memory, then mark yourself against the pack."
      },
      {
        "label": "Close: update the error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Tick a topic off the error log ONLY if it passed the closed-book re-test clean. Anything still shaky stays open and carries into the next repair pass — don't sweep it under to make the log look clean.",
        "checklistText": "Tick off only the topics that passed the closed-book re-test clean; leave anything shaky open on the log."
      }
    ]
  },
  'card-094': {
    "concepts": [
      "A fast open-book pack has its 3 most-opened pages at the very front, not buried in session order",
      "\"Final\" means every gap flagged back in Phase 3 now visibly has a fix in the pack — not just fewer gaps"
    ],
    "steps": [
      {
        "label": "Read: final pass over the master contents/index",
        "kind": "read",
        "minutes": 20,
        "instruction": "Read the pack's own contents/index page end to end, one last time. For every entry, confirm it still points to the right page after everything added or moved this campaign — fix any stale page number immediately, don't just note it for later.",
        "checklistText": "Read the pack's contents/index end to end and fix any stale page number immediately, not just flag it."
      },
      {
        "label": "Reorder: move the 3 most-used pages to the front",
        "kind": "do",
        "minutes": 15,
        "instruction": "Name the 3 pages you've actually opened most across every mock so far (likely a formula sheet, a classifier/method picker, and the leakage/traps page) and physically re-tab or move them to the very front of the pack, ahead of the session-by-session order.",
        "checklistText": "Re-tab the formula sheet, classifier picker, and leakage/traps page to the very front of the pack."
      },
      {
        "label": "Verify: close every Phase-3 gap",
        "kind": "do",
        "minutes": 25,
        "instruction": "Pull whatever gap list you made back in Phase 3 and check it item by item against the current pack. Anything still missing gets written into the pack right now — this is the last card with room to add new pages before the schedule turns to pure mocks and repair.",
        "checklistText": "Check your Phase 3 gap list against the current pack and write in anything still missing right now."
      }
    ]
  },
  'card-098': {
    "concepts": [
      "Mock #5 runs to the exact same 90+30 min format as every AML mock — consistency is what makes scores across mocks comparable",
      "Fumbles get ranked and handed off; a score alone doesn't choose tomorrow's work"
    ],
    "steps": [
      {
        "label": "Do: sit mock #5 cold, open-book only",
        "kind": "do",
        "minutes": 120,
        "instruction": "Set a timer to 90 minutes plus a 30 minute upload buffer — the real CMT307 class-test format (s1-module-shape). Sit it cold: pack open for navigation only, no notes read beforehand, no internet, no AI. Keep s1-exam-strategy's rules running while you work — run code before reading it, change one thing at a time, print shapes at boundaries — and use the 30 min buffer strictly for uploading.",
        "noteIds": [
          "s1-module-shape",
          "s1-exam-strategy"
        ],
        "checklistText": "Set a 90-minute timer plus 30-minute upload buffer, then sit mock #5 with only the pack open for navigation."
      },
      {
        "label": "Mark: score against worked solutions / lab outputs",
        "kind": "test",
        "minutes": 45,
        "instruction": "Mark every question against your own worked solutions and lab notebook outputs, not from memory. Be strict — directionally-right-but-broken code still counts wrong.",
        "checklistText": "Grade every mock #5 answer against your worked solutions and lab outputs; broken code still counts wrong."
      },
      {
        "label": "Log: score + full fumble list",
        "kind": "write",
        "minutes": 20,
        "instruction": "Record mock #5's score. List every topic you fumbled, ranked by marks lost, worst first — not just the ones you remember without checking.",
        "checklistText": "Record mock #5's score and rank every fumbled topic by marks lost, worst first, checking rather than relying on memory."
      },
      {
        "label": "Write: hand off the 3 worst fumbles",
        "kind": "write",
        "minutes": 10,
        "instruction": "Take the top 3 from the ranked list and fold them into card-101's repair pass (the next AML card) — name the specific method or concept each one tests so that card starts on diagnosis, not re-reading this script.",
        "checklistText": "Name the specific method behind your top 3 fumbles and add them to card-101's repair list so it starts on diagnosis."
      }
    ]
  },
  'card-101': {
    "concepts": [
      "Navigation speed is measured with a stopwatch, not assumed from familiarity with the pack",
      "Zero open items on the error log is the actual finish line for this stage, not a rough target"
    ],
    "steps": [
      {
        "label": "Drill: race 20 lookups against the clock",
        "kind": "do",
        "minutes": 25,
        "instruction": "Write 20 realistic exam-style lookup prompts spanning all 5 sessions (a formula, a code recipe, a specific trap). Stopwatch each one from reading the prompt to landing on the right page. Flag anything over roughly 20 seconds.",
        "checklistText": "Write 20 exam-style lookup prompts across all 5 sessions and stopwatch each one, flagging any over 20 seconds."
      },
      {
        "label": "Fix: rework every slow page",
        "kind": "do",
        "minutes": 20,
        "instruction": "For each page flagged slow, fix the actual cause — bigger heading, better tab, moved earlier, shorter entry — then re-time just that one lookup to confirm it's genuinely faster now.",
        "checklistText": "Fix each slow page with a bigger heading, better tab, or shorter entry, then re-time it to confirm it's actually faster."
      },
      {
        "label": "Repair: close out remaining weak topics",
        "kind": "do",
        "minutes": 70,
        "instruction": "Pull whatever is still open on the error log, including anything mock #5 added. For each, use the same loop as the dedicated repair cards: re-derive or re-run, then test yourself closed-book. Don't reopen anything already ticked clean.",
        "checklistText": "Re-derive or re-run every topic still open on the error log, including mock #5's additions, then test yourself closed-book."
      },
      {
        "label": "Close: confirm zero open items",
        "kind": "write",
        "minutes": 20,
        "instruction": "Walk the whole error log top to bottom. Every AML line needs either a passed closed-book re-test date or an explicit \"accepted, out of scope\" note — nothing ambiguous survives this card.",
        "checklistText": "Walk the entire error log and give every AML line either a passed closed-book re-test date or an explicit out-of-scope note."
      }
    ]
  },
  'card-106': {
    "concepts": [
      "Mock #6 runs to the same 90+30 min format as every mock so far — no shortcuts this close to the exam",
      "The value of a mock is entirely in what gets fixed afterward, not the number itself"
    ],
    "steps": [
      {
        "label": "Do: sit mock #6 cold, open-book only",
        "kind": "do",
        "minutes": 120,
        "instruction": "Set a timer to 90 minutes plus a 30 minute upload buffer — the real CMT307 class-test format (s1-module-shape). Sit it cold: pack open for navigation only, no notes read beforehand, no internet, no AI. Keep s1-exam-strategy's rules running — run code before reading it, change one thing at a time, print shapes at boundaries — and save the 30 min buffer strictly for uploading.",
        "noteIds": [
          "s1-module-shape",
          "s1-exam-strategy"
        ],
        "checklistText": "Set a 90-minute timer plus 30-minute upload buffer, then sit mock #6 with only the pack open for navigation."
      },
      {
        "label": "Mark: score against worked solutions / lab outputs",
        "kind": "test",
        "minutes": 45,
        "instruction": "Mark every question against your own worked solutions and lab notebook outputs, not from memory. Be strict — directionally-right-but-broken code still counts wrong.",
        "checklistText": "Grade every mock #6 answer against your worked solutions and lab outputs; broken code still counts wrong."
      },
      {
        "label": "Log: score + full fumble list",
        "kind": "write",
        "minutes": 20,
        "instruction": "Record mock #6's score. List every topic you fumbled, ranked by marks lost, worst first.",
        "checklistText": "Record mock #6's score and rank every fumbled topic by marks lost, worst first."
      },
      {
        "label": "Write: hand off the 3 worst fumbles",
        "kind": "write",
        "minutes": 10,
        "instruction": "Take the top 3 from the ranked list and write them as the opening line of tomorrow's repair card (card-109) — name the specific method or concept each one tests, not a vague topic area.",
        "checklistText": "Write the top 3 fumbles as the opening line of card-109, naming the specific method each one tests."
      }
    ]
  },
  'card-109': {
    "concepts": [
      "Same 4-step repair loop as repair #4 — diagnose, re-derive/re-run, closed-book re-test, close",
      "No broad re-reading: only the 3 topics the error log actually names get touched"
    ],
    "steps": [
      {
        "label": "Diagnose: name the 3 weakest topics from mock #6",
        "kind": "do",
        "minutes": 15,
        "instruction": "Open the mock #6 script and error log side by side. For every wrong or blank answer, name the SPECIFIC method it tested. Rank by marks lost and pick the worst 3 — these are the only 3 this card touches.",
        "checklistText": "Compare the mock #6 script against the error log and rank the worst 3 topics by specific method tested."
      },
      {
        "label": "Repair: re-derive or re-run each of the 3",
        "kind": "do",
        "minutes": 60,
        "instruction": "For each of the 3, go straight to the matching page or lab cell in your pack. Either re-derive the method by hand or re-run the actual lab notebook cell until the output makes sense again. Budget 20 min each — if one still isn't clicking at 20 min, flag it and move on.",
        "checklistText": "Re-derive by hand or re-run the matching lab cell for each topic, budgeting 20 minutes before flagging and moving on."
      },
      {
        "label": "Re-test: closed-book, just these 3",
        "kind": "test",
        "minutes": 20,
        "instruction": "Close every resource. Answer one mock-style question per topic from memory only, then mark yourself against the pack afterward. No peeking mid-answer.",
        "checklistText": "Close every resource and answer one mock-style question per topic from memory, marking against the pack only afterward."
      },
      {
        "label": "Close: update the error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Tick a topic off the error log ONLY if it passed the closed-book re-test clean. Anything still shaky stays open and carries into the next repair pass.",
        "checklistText": "Tick a topic off the error log only if it passed the closed-book re-test clean; leave anything shaky open."
      }
    ]
  },
  'card-115': {
    "concepts": [
      "This is the last dedicated repair pass — anything still open here rides into the exam if it doesn't close now",
      "Lookup speed under a stopwatch is a separate skill from topic knowledge and needs its own drill, not an assumption"
    ],
    "steps": [
      {
        "label": "Diagnose: name the last 2-3 weak topics",
        "kind": "do",
        "minutes": 15,
        "instruction": "Open the error log, plus mock #6's script if anything from it is still unresolved. Name the 2-3 weakest remaining topics specifically, not a vague area — this is the last scheduled chance to catch them before the final mock.",
        "checklistText": "Check the error log and mock #6 script for unresolved items, and name the 2-3 weakest remaining topics specifically."
      },
      {
        "label": "Repair: re-derive or re-run each",
        "kind": "do",
        "minutes": 45,
        "instruction": "Same method as every repair pass: go to the matching page or lab cell for each of the 2-3 topics and either re-derive it by hand or re-run the lab cell until it's clean. Roughly 15-20 min each.",
        "checklistText": "Re-derive or re-run each of the 2-3 remaining topics at its matching page or lab cell, roughly 15-20 minutes apiece."
      },
      {
        "label": "Re-test: closed-book on just these",
        "kind": "test",
        "minutes": 20,
        "instruction": "Close every resource and answer one question per topic from memory. Mark against the pack afterward — no peeking mid-answer.",
        "checklistText": "Close every resource, answer one question per topic from memory, and mark against the pack only afterward."
      },
      {
        "label": "Drill: race 30 lookups under a stopwatch",
        "kind": "do",
        "minutes": 40,
        "instruction": "Write 30 realistic lookup prompts spanning all 5 sessions, including anything added to the pack in card-094 or card-101. Stopwatch every one; flag and immediately fix any page that's still slow to find.",
        "checklistText": "Write 30 lookup prompts spanning all 5 sessions, including additions from card-094 and card-101, fixing any page that's still slow."
      },
      {
        "label": "Close: confirm zero open items",
        "kind": "write",
        "minutes": 15,
        "instruction": "Final walk of the error log. Every AML line must show a passed closed-book re-test date. Whatever is still open is the single most important thing to fix before the mocks run out — not tomorrow's problem.",
        "checklistText": "Do a final walk of the error log and confirm every AML line shows a passed closed-book re-test date before mocks run out."
      }
    ]
  },
  'card-117': {
    "concepts": [
      "The final mock runs to the exact same 90+30 min format as every mock before it — nothing changes this late",
      "With no dedicated AML card left after this one, any fumble found here gets patched immediately, not deferred"
    ],
    "steps": [
      {
        "label": "Do: sit mock #8 cold, open-book only",
        "kind": "do",
        "minutes": 120,
        "instruction": "Set a timer to 90 minutes plus a 30 minute upload buffer — the real CMT307 class-test format (s1-module-shape), same as every mock so far. Sit it cold: pack open for navigation only, no notes read beforehand, no internet, no AI. Keep s1-exam-strategy's rules running — run code before reading it, change one thing at a time, print shapes at boundaries — right through to the real exam.",
        "noteIds": [
          "s1-module-shape",
          "s1-exam-strategy"
        ],
        "checklistText": "Set a 90-minute timer plus 30-minute upload buffer, then sit mock #8 with only the pack open for navigation, no outside help."
      },
      {
        "label": "Mark: score against worked solutions / lab outputs",
        "kind": "test",
        "minutes": 45,
        "instruction": "Mark every question against your own worked solutions and lab notebook outputs, not from memory. Be strict — this is the last honest read you'll get on where things stand.",
        "checklistText": "Grade every mock #8 answer against your worked solutions and lab outputs — this is your last honest read before the exam."
      },
      {
        "label": "Log: score + full fumble list",
        "kind": "write",
        "minutes": 20,
        "instruction": "Record mock #8's score. List every topic you fumbled, ranked by marks lost, worst first.",
        "checklistText": "Record mock #8's score and rank every fumbled topic by marks lost, worst first."
      },
      {
        "label": "Write: patch the worst fumble now",
        "kind": "write",
        "minutes": 10,
        "instruction": "There is no dedicated AML repair card left after this one, so don't defer: pick the single costliest fumble and write the exact fix — the one line, formula, or rule you got wrong — directly into the pack right now. Log the other two on the error log for card-120's light recall pass before the exam.",
        "checklistText": "Write the exact fix for your single costliest fumble directly into the pack now, and log the other two for card-120."
      }
    ]
  },
  'card-009': {
    "concepts": [
      "Strict (n-order) stationarity vs wide-sense (WSS) stationarity, and why higher-order stationarity implies lower-order",
      "Proof that strict stationarity + finite second moment implies WSS (constant mean, then covariance via the shift s = -t2)",
      "The five R(t)/rho(t) properties: R(0)=Var(x_t), rho(0)=1, |R(t)|<=R(0), |rho(t)|<=1, R(-t)=R(t)"
    ],
    "steps": [
      {
        "label": "Read: L3 + L4 lecture notes",
        "kind": "read",
        "minutes": 35,
        "instruction": "Read the L3 (Learning Materials) and L4 (Complete notes) PDFs once through, no note-taking. Redo the one worked example on checking stationarity by hand instead of just reading the solution.",
        "resourceIds": [
          "timeSeries-lecture-notes-lecture-3-learning-material-notes",
          "timeSeries-lecture-notes-complete-lecture-4-notes"
        ],
        "noteIds": [
          "ts-continuous-discrete",
          "ts-stochastic-process"
        ],
        "checklistText": "Read the L3 and L4 PDFs once through, then redo the stationarity-checking worked example by hand instead of reading the solution."
      },
      {
        "label": "Compare: strict vs WSS definitions side by side",
        "kind": "read",
        "minutes": 20,
        "instruction": "Draw a two-column table: n-order/strict stationarity (all n) on the left, WSS's two conditions (constant mean, lag-only covariance) on the right. Underline the direction of Lemma 3 and that the converse is false.",
        "noteIds": [
          "ts-strict-stationarity",
          "ts-wss"
        ],
        "checklistText": "Draw a two-column table contrasting strict stationarity with WSS's two conditions, underlining that Lemma 3's converse is false."
      },
      {
        "label": "Write: the full WSS argument",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book, write the full proof that strict stationarity + finite 2nd moment implies WSS: the constant-mean step, then the covariance step using the shift s = -t2, stating explicitly where E x_t^2 < infinity is used. Only check against ts-wss-proof after your attempt is done.",
        "noteIds": [
          "ts-wss-proof"
        ],
        "checklistText": "Closed-book, write the full proof that strict stationarity implies WSS, stating exactly where the finite second-moment condition is used."
      },
      {
        "label": "Self-test: autocovariance/autocorrelation properties",
        "kind": "test",
        "minutes": 20,
        "instruction": "From memory, state and justify all five R/rho properties (R(0)=Var, rho(0)=1, |R(t)|<=R(0), |rho(t)|<=1, R(-t)=R(t)). Flag any you can't derive on the spot and re-check against ts-wss.",
        "checklistText": "From memory, state and justify all five autocovariance/autocorrelation properties, flagging any you can't derive on the spot."
      }
    ]
  },
  'card-010': {
    "concepts": [
      "Covariance functions for white noise, random walk, Wiener process, Brownian bridge, and Poisson process",
      "Stationarity status for each named process, with the exact reason a non-stationary process fails WSS"
    ],
    "steps": [
      {
        "label": "Read: the five named-process notes",
        "kind": "read",
        "minutes": 30,
        "instruction": "Read all five notes once, focusing only on the definition box and the covariance formula in each. Skip the R code blocks this pass.",
        "noteIds": [
          "ts-white-noise",
          "ts-random-walk",
          "ts-wiener",
          "ts-brownian-bridge",
          "ts-poisson"
        ],
        "checklistText": "Read all five process notes once, focusing only on each definition box and covariance formula, skipping the R code."
      },
      {
        "label": "Write: covariance + stationarity verdict for each process",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book, write the covariance function for each of the five processes, then add a WSS verdict with one reason. White noise is WSS under the lecture definition; random walk and Wiener fail because variance depends on time; Brownian bridge covariance depends on t and s separately; Poisson variance grows with time. Do not call those four 'long memory' — the lecture defines short/long-range dependence only for stationary processes.",
        "noteIds": [
          "ts-white-noise",
          "ts-random-walk",
          "ts-wiener",
          "ts-brownian-bridge",
          "ts-poisson"
        ],
        "checklistText": "Closed-book, write each covariance plus a WSS-or-not verdict with the exact failing condition."
      },
      {
        "label": "Assemble: TS_PackB_definitions.md",
        "kind": "write",
        "minutes": 15,
        "instruction": "Consolidate the five covariances and stationarity verdicts into the one-page evidence file. Check every formula and every reason against the notes once before closing the card.",
        "checklistText": "Consolidate all five covariances and stationarity verdicts into TS_PackB_definitions.md."
      }
    ]
  },
  'card-012': {
    "concepts": [
      "Applying the WSS test, named-process covariance formulas, and positive-semidefiniteness proof to exam-style problems",
      "Closed-book reproduction of two named covariances and the full WSS argument under time pressure"
    ],
    "steps": [
      {
        "label": "Do: 3 worked examples",
        "kind": "do",
        "minutes": 45,
        "instruction": "Pick 3 problems from the L3/L4 exam-like exercises spanning: (a) decide WSS or not, (b) compute a named-process covariance, and (c) prove a covariance/correlation function is positive semidefinite. Write full workings by hand, no peeking at notes.",
        "resourceIds": [
          "timeSeries-exam-like-exercises-exam-like-exercises-l3",
          "timeSeries-exam-like-exercises-exam-like-exercises-l4"
        ],
        "checklistText": "Hand-write full workings for a WSS check, a named covariance, and the positive-semidefinite variance proof."
      },
      {
        "label": "Check: against L3/L4 solutions",
        "kind": "read",
        "minutes": 15,
        "instruction": "Mark your 3 write-ups against the official solutions. Note every slip in reasoning, not just wrong final answers.",
        "resourceIds": [
          "timeSeries-exam-like-solutions-exam-like-solutions-l3",
          "timeSeries-exam-like-solutions-exam-like-solutions-l4"
        ],
        "checklistText": "Mark your 3 write-ups against the official L3/L4 solutions, flagging reasoning slips not just wrong answers."
      },
      {
        "label": "Self-test: closed-book reproduction",
        "kind": "test",
        "minutes": 30,
        "instruction": "Closed book: reproduce 2 named covariances (pick your two weakest) and the full 'strict + finite 2nd moments => WSS' argument from memory, no notes. Time yourself.",
        "checklistText": "Closed-book, timed: reproduce your two weakest covariances and the full WSS argument from memory."
      },
      {
        "label": "Flag: shaky spots",
        "kind": "write",
        "minutes": 15,
        "instruction": "List everything you got wrong or hesitated on across the 3 examples and the self-test. This list becomes your last pre-mock review before Pack B is marked done.",
        "checklistText": "List every wrong or hesitant point from today's examples and self-test as your pre-mock review list."
      }
    ]
  },
  'card-015': {
    "concepts": [
      "Bochner–Khinchin spectral representation: R(t) = ∫e^{itλ}f(λ)dλ, continuous vs discrete limits of integration",
      "Mercer expands the covariance function R(t,s); Karhunen–Loève expands the process x_t itself, same λ_j and φ_j",
      "One representative calculation each for covariance recovery/filtering, BLUP setup, and sample covariance/periodogram"
    ],
    "steps": [
      {
        "label": "Read + redo: L5 spectral density, covariance relation, Mercer/KL",
        "kind": "do",
        "minutes": 40,
        "instruction": "Work the L5 gap sheet's spectral-density and covariance-relation examples by hand before checking the fill-ins; cross-check against Pack C where the gap sheet is thin. Then read ts-mercer-kl's two-sentence theorem once and answer its 3 check-yourself prompts cold — Mercer expands R(t,s), Karhunen–Loève expands x_t.",
        "resourceIds": [
          "timeSeries-lecture-notes-with-gaps-lecture-5-active-recall-notes",
          "timeSeries-study-packs-pack-c-l5-l7-spectral-and-prediction"
        ],
        "noteIds": [
          "ts-mercer-kl"
        ],
        "checklistText": "Hand-work the L5 spectral-density and covariance examples, then answer the Mercer/Karhunen-Loeve prompts from memory."
      },
      {
        "label": "Read + redo: L6–L7 periodogram, filtering, BLUP/estimation setup",
        "kind": "do",
        "minutes": 40,
        "instruction": "From the L6–L7 gap sheets, redo one filtering or periodogram example by hand, then set up (without fully solving) one BLUP matrix and one sample-covariance calculation. Card-021 handles the full closed-book BLUP and estimation work; this pass must still touch each core method once.",
        "resourceIds": [
          "timeSeries-lecture-notes-with-gaps-lecture-6-active-recall-notes",
          "timeSeries-lecture-notes-with-gaps-lecture-7-active-recall-notes"
        ],
        "checklistText": "Redo one filtering/periodogram example, then set up one BLUP matrix and one sample-covariance calculation."
      },
      {
        "label": "Flag shaky steps",
        "kind": "test",
        "minutes": 25,
        "instruction": "Write down the 2–3 worked examples from L5–L7 that took longest or felt most guessed — spectral-density↔covariance, periodogram, filtering, or the BLUP/estimation setup. This list is exactly what card-018's sheet and card-021's self-test should target first.",
        "checklistText": "Write down the 2-3 L5-L7 examples that took longest or felt most guessed, for card-018/021."
      }
    ]
  },
  'card-018': {
    "concepts": [
      "Spectral density formula and the covariance ↔ spectrum relation (cosine-transform recovery)",
      "Spectrum of a sinusoid/sum: amplitudes enter squared, spectra of sums add",
      "Filtering: spectrum of filtered series = product of filter and base spectra",
      "Short-range vs long-range dependence: the lecture's ΣR(k) test for a stationary process, via |k|^{-α}, α>1 for the supplied positive examples"
    ],
    "steps": [
      {
        "label": "Read/consolidate: the 5 spectral notes",
        "kind": "read",
        "minutes": 30,
        "instruction": "Second pass, fast: pull one killer line from each — Bochner–Khinchin's two integral forms (mind the [-π,π] vs (-∞,∞) limits), the cosine-transform recovery, the squared-amplitude sinusoid rule, the 'multiply the spectra' filtering rule, and the lecture's stationary-process ΣR(k) range test reduced to |k|^{-α}, α>1 for the supplied positive examples.",
        "noteIds": [
          "ts-bochner-khinchin",
          "ts-spectrum-covariance",
          "ts-sinusoid-spectrum",
          "ts-filtering",
          "ts-short-long-range"
        ],
        "checklistText": "Pull one key takeaway line from each of the 5 spectral notes, fast, on this second pass."
      },
      {
        "label": "Write: TS_PackC_spectral_sheet.md, one page",
        "kind": "write",
        "minutes": 50,
        "instruction": "Closed-book, one page: (1) Bochner–Khinchin, discrete case with limits stated explicitly, (2) the covariance-recovery cosine transform with one worked R(k) example, (3) the sinusoid and filtering spectrum rules side by side since they share the same delta-function language, (4) the short/long-range exponent test. Define every symbol inline. Spend your last 5 minutes cross-checking against the master formula sheet for anything missing.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet"
        ],
        "checklistText": "Write TS_PackC_spectral_sheet.md closed-book, covering Bochner-Khinchin, covariance recovery, sinusoid/filtering rules, and the range test."
      },
      {
        "label": "Self-check against the notes' prompts",
        "kind": "test",
        "minutes": 25,
        "instruction": "Cover the sheet and answer the check-yourself questions from all 5 notes cold. Anything missed gets added back to the sheet now, not discovered at the mock.",
        "checklistText": "Cover your sheet and answer all 5 notes' check-yourself questions cold; add back anything missed."
      }
    ]
  },
  'card-021': {
    "concepts": [
      "BLUP: matrix solution λ_h=Σ^{-1}b_h, x̂_{n+h}=μ̂+λ_h^T Y, and the prediction-MSE formula",
      "Sample mean/covariance estimators: X̄_n unbiased, R̂(k) vs R̃(k) bias/MSE trade-off",
      "Closed-book reproduction of both, with shaky points named — completes TS Pack C"
    ],
    "steps": [
      {
        "label": "BLUP: derivation + 3-observation worked example",
        "kind": "do",
        "minutes": 35,
        "instruction": "Read ts-blup-derivation once for the matrix result (λ_h=Σ^{-1}b_h, MSE=R(0)-b_h^TΣ^{-1}b_h), then close it and redo ts-blup-worked's 3-observation example (x_1=62, x_2=67, x_3=63, R(k)=2/√(1+k²)) by hand: build Σ and b_1, solve, predict x̂_4, and give the normal prediction bounds. Check b_h's ordering (furthest lag first) against your own attempt.",
        "noteIds": [
          "ts-blup-derivation",
          "ts-blup-worked"
        ],
        "checklistText": "Redo the 3-observation BLUP example by hand (x1=62, x2=67, x3=63) to predict x4 and its bounds."
      },
      {
        "label": "Estimation: mean + covariance worked example",
        "kind": "do",
        "minutes": 30,
        "instruction": "Reproduce the nVar(X̄_n)→2πf(0) counting argument (each lag k appears n-|k| times) from ts-estimation-mean, then redo ts-estimate-covariance's worked correlogram on the series 4,1,4,5,1 by hand — centre to 1,-2,1,2,-2, compute R̂(0) through R̂(4) dividing always by n=5, and state the R̂ vs R̃ bias/MSE trade-off.",
        "noteIds": [
          "ts-estimation-mean",
          "ts-estimate-covariance"
        ],
        "checklistText": "Hand-redo the correlogram worked example on series 4,1,4,5,1, computing R-hat(0) through R-hat(4)."
      },
      {
        "label": "Closed-book self-test; flag shaky",
        "kind": "test",
        "minutes": 40,
        "instruction": "Closed-book: state the BLUP matrix solution and redo the 3-observation prediction from memory; state the mean estimator's variance limit and redo the correlogram table from memory. Mark against your own work above. Name anything still shaky — this closes TS Pack C, so a named gap here is exactly what the Pack C past-paper templates should target next.",
        "checklistText": "Closed-book: restate the BLUP solution and redo the correlogram from memory, naming any shaky step."
      }
    ]
  },
  'card-025': {
    "concepts": [
      "ARMA(p,q) definition: the equation, sign convention (AR terms minus, MA terms plus), and the three side-conditions (stationarity, a_p/b_q nonzero, no common roots)",
      "Backshift operator: Bx_t = x_{t-1}, and writing the ARMA equation as a(B)x_t = b(B)ε_t",
      "When a stationary solution exists (no roots of a(z) ON the unit circle) vs when it is causal (no roots inside or on it) — the two-sided vs one-sided sum distinction",
      "First-pass shape of the causality/invertibility root test (the procedure itself is card-028's job)"
    ],
    "steps": [
      {
        "label": "Read: Pack D (L8–L10 ARMA definitions), single skim",
        "kind": "read",
        "minutes": 35,
        "instruction": "One pass, cover to cover — this is the synthesized L8–L10 read covering ARMA definition, backshift, causality/invertibility, and stationary existence together. Read for the SHAPE only, don't work any example yet; that's the next step.",
        "resourceIds": [
          "timeSeries-study-packs-pack-d-l8-l10-arma-definitions"
        ],
        "checklistText": "Skim Pack D cover to cover for shape only: ARMA definition, backshift, causality, stationary existence."
      },
      {
        "label": "Redo by hand: ARMA definition + backshift worked examples",
        "kind": "do",
        "minutes": 35,
        "instruction": "Cold-work the 'Check yourself' items in both notes on paper first (the three side-conditions; writing a(z)/b(z) for a given equation). Then pull one worked example each for the ARMA definition and the backshift/operator-form algebra straight from the Complete lecture 8 notes and redo those by hand. Together these ARE the hand-redone L8–L10 worked-example sheet this card asks for.",
        "resourceIds": [
          "timeSeries-lecture-notes-complete-lecture-8-notes"
        ],
        "noteIds": [
          "ts-arma-definition",
          "ts-backshift"
        ],
        "checklistText": "Cold-work the ARMA side-conditions and backshift check-yourself items, then redo one Lecture 8 example each."
      },
      {
        "label": "Read: when stationarity exists + first look at causality/invertibility",
        "kind": "read",
        "minutes": 20,
        "instruction": "Read the three-row table distinguishing 'no roots ON the circle' (unique stationary solution, two-sided sum) from 'no roots inside or on' (causal, one-sided sum) from 'a root ON the circle' (non-stationary) — this exact distinction is the trap card-028's root-check drills assume you already have. Skim Pack D's causality/invertibility section once more for the shape of the test only; don't drill the procedure yet.",
        "noteIds": [
          "ts-stationary-existence"
        ],
        "checklistText": "Learn the three-case root table: unique stationary solution, causal one-sided sum, or a root exactly on the circle."
      },
      {
        "label": "Self-check: flag shaky steps",
        "kind": "test",
        "minutes": 15,
        "instruction": "Closed-book: recite the ARMA definition's three side-conditions and the backshift equation form (a(B)x_t = b(B)ε_t) from memory. Write down anything you couldn't produce cold, plus any causality/invertibility confusion — carry that list straight into card-028.",
        "checklistText": "Recite the ARMA side-conditions and backshift equation from memory; note gaps to carry into card-028."
      }
    ]
  },
  'card-028': {
    "concepts": [
      "Causality root test: a(z) has all roots strictly outside the unit circle",
      "Invertibility root test: b(z) has all roots strictly outside the unit circle; the causal/invertible symmetry table",
      "Factor-and-solve method for finding parameter values that make a process non-stationary or not causal",
      "AR/ARMA covariance R(k) computed from the MA-representation coefficients c_j"
    ],
    "steps": [
      {
        "label": "Read: causality + invertibility root-check procedure",
        "kind": "read",
        "minutes": 35,
        "instruction": "Read both notes' 'practical test — three steps' boxes and their worked examples (including the counter-intuitive direction: roots must be OUTSIDE the unit circle). As you go, copy the causal/invertible symmetry table (a(z) for causal, b(z) for invertible, same test) onto your template sheet — that table is one of the two clean templates the evidence file needs.",
        "noteIds": [
          "ts-causality",
          "ts-invertibility"
        ],
        "checklistText": "Read both root-test worked examples and copy the causal/invertible symmetry table onto your template sheet."
      },
      {
        "label": "Work: parametrized root-finding (find c making a process non-stationary)",
        "kind": "do",
        "minutes": 20,
        "instruction": "Work the mock's 'find at least two values of c' example by hand — move everything to the left, read off a(z), factor by grouping, then set |root| = 1 — before checking against the note. This factor-and-solve pattern is the recurring exam slot (vii); note the wording trap between 'non-stationary' (root ON the circle) and 'not causal' (root INSIDE it).",
        "noteIds": [
          "ts-stationarity-parameter"
        ],
        "checklistText": "Hand-solve the mock's 'find values of c' problem by factoring a(z) and setting root magnitude to 1."
      },
      {
        "label": "Work: AR/ARMA covariance via the MA-representation coefficients",
        "kind": "do",
        "minutes": 35,
        "instruction": "Work the c_j recursion (c_0=1, c_j = a_1c_{j-1}+…+a_pc_{j-p}) for the mock's causal AR(3) by hand, then redo the ARMA(1,1) example's covariance step R(k) = σ²Σ c_sc_{s+k}. This is your AR-covariance template — for AR(1)/AR(2) it's the same recipe with the higher-order a_i set to zero.",
        "noteIds": [
          "ts-ma-representation",
          "ts-arma-to-ma-worked"
        ],
        "checklistText": "Hand-work the c_j recursion for the causal AR(3) mock, then redo the ARMA(1,1) covariance step."
      },
      {
        "label": "Write: one clean template for each",
        "kind": "write",
        "minutes": 15,
        "instruction": "Write TS_PackD_ARMA_templates.md with three fill-in-the-blanks blocks you could apply cold to a new process: (1) causality/invertibility root-test steps + symmetry table, (2) the factor-and-solve method for parametrized roots, (3) the covariance-via-MA-coefficients recipe.",
        "checklistText": "Write TS_PackD_ARMA_templates.md with fill-in blocks for root tests, parametrized roots, and MA-coefficient covariance."
      }
    ]
  },
  'card-031': {
    "concepts": [
      "MA(q) covariance cutoff: R(k) = 0 for |k| > q, because c_j = 0 beyond j = q",
      "AR(1) covariance and correlation: R(k)=σ²a^{|k|}/(1-a²), ρ(k)=a^{|k|}",
      "AR(2) correlation recursion: ρ(1)=a1/(1-a2), ρ(2)=a1ρ(1)+a2, then recurse",
      "Closed-book self-test covering all of Pack D (L8–L10), with shaky items flagged"
    ],
    "steps": [
      {
        "label": "Work: MA(q) covariance cutoff",
        "kind": "do",
        "minutes": 25,
        "instruction": "Redo the MA(1) case from ts-ma1-estimation by hand, then use the general R(k)=σ²Σc_sc_{s+|k|} formula to show why an MA(q) forces R(k)=0 once |k|>q. Cross-check the general theorem on Lecture 8 p.10.",
        "resourceIds": [
          "timeSeries-lecture-notes-complete-lecture-8-notes"
        ],
        "noteIds": [
          "ts-ma1-estimation",
          "ts-arma-to-ma-worked"
        ],
        "checklistText": "Hand-redo the MA(1) covariance case, then derive why MA(q) forces R(k)=0 past lag q."
      },
      {
        "label": "Work: AR(1) and AR(2) covariance/correlation recursions",
        "kind": "do",
        "minutes": 25,
        "instruction": "From Lecture 9, reproduce the AR(1) covariance/correlation formula, then derive the AR(2) starting values ρ(1), ρ(2) and compute the next two lags by recursion.",
        "resourceIds": [
          "timeSeries-lecture-notes-complete-lecture-9-notes"
        ],
        "checklistText": "Reproduce the AR(1) formula and compute an AR(2) correlation sequence from its Yule-Walker starting values."
      },
      {
        "label": "Timed self-test: Exam-like exercises L9",
        "kind": "test",
        "minutes": 30,
        "instruction": "Closed-book, timed: work through the L9 ARMA-properties exam-like exercises cold. This is the closest real drill set to today's MA cutoff and AR covariance-recursion content, and doubles as the self-test the card's evidence requirement asks for.",
        "resourceIds": [
          "timeSeries-exam-like-exercises-exam-like-exercises-l9"
        ],
        "checklistText": "Work the L9 ARMA-properties exam-like exercises closed-book and timed, as today's self-test evidence."
      },
      {
        "label": "Mark, flag shaky, and close Pack D",
        "kind": "test",
        "minutes": 25,
        "instruction": "Mark your L9 answers against the solution set, then reproduce the MA cutoff and AR(1)/AR(2) correlation rules from memory. Name anything still shaky — from today or carried over from card-025/card-028 — explicitly in writing; Pack D closes here, so nothing shaky should go forward unnamed.",
        "resourceIds": [
          "timeSeries-exam-like-solutions-exam-like-solutions-l9"
        ],
        "checklistText": "Mark your L9 answers, reproduce the MA cutoff and AR correlation rules, and name every remaining shaky point."
      }
    ]
  },
  'card-034': {
    "concepts": [
      "Mean of an ARMA process with an intercept: μ = δ / a(1), the AR polynomial at z=1",
      "How Yule-Walker estimation, MA(1) moment estimation, AR forecasting, and ARIMA/SARIMA structure fit together across L11-L13",
      "ARIMA is difference-then-ARMA; SARIMA adds seasonal differencing and seasonal AR/MA polynomials"
    ],
    "steps": [
      {
        "label": "Read: L11-L13 complete lecture notes",
        "kind": "read",
        "minutes": 40,
        "instruction": "First pass only: L11 covers the ARMA mean and Yule-Walker/MA(1) estimation; L12 covers stationary/ARMA forecasting; L13 supplies worked forecasting plus ARIMA/SARIMA. Mark one representative example per method for the next step.",
        "resourceIds": [
          "timeSeries-lecture-notes-complete-lecture-11-notes",
          "timeSeries-lecture-notes-complete-lecture-12-notes",
          "timeSeries-lecture-notes-complete-lecture-13-notes"
        ],
        "noteIds": [
          "ts-arma-mean",
          "ts-arima-sarima"
        ],
        "checklistText": "Skim all three lectures once, marking where each worked example sits, without solving anything yet."
      },
      {
        "label": "Write: redo the L11-L13 worked examples",
        "kind": "write",
        "minutes": 45,
        "instruction": "By hand, redo one core example per method: the ARMA mean with an intercept, an AR(2) Yule-Walker setup, the MA(1) moment equation and root choice, one AR forecast with bounds, and the Lecture 13 ARIMA(1,1,0)/SARIMA structure. Use the notes only after each attempt.",
        "noteIds": [
          "ts-yule-walker-worked",
          "ts-ma1-estimation",
          "ts-forecast-ar1",
          "ts-arima-sarima"
        ],
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet"
        ],
        "checklistText": "Hand-redo one example each: ARMA mean with intercept, Yule-Walker setup, MA(1) moments, AR forecast, ARIMA/SARIMA sketch."
      },
      {
        "label": "Self-check: flag shaky steps",
        "kind": "test",
        "minutes": 20,
        "instruction": "Reread your redone sheet cold. Circle any line you couldn't reproduce without looking, and name the exact gap next to it (e.g. 'sign flip', 'which root', 'recursion bound'). This list becomes the priority order for card-037 and card-040.",
        "checklistText": "Reread your redone sheet cold, circling any line you couldn't reproduce and naming the exact gap."
      }
    ]
  },
  'card-037': {
    "concepts": [
      "Yule-Walker: estimate the mean, then correlations, then solve â = Ĉ⁻¹v̂; σ̂² = R̂(0)(1 - Σâᵢρ̂(i))",
      "MA(1) estimation: ρ(1) = b1/(1+b1²) gives a quadratic in b1 -- keep the root with |b1| < 1"
    ],
    "steps": [
      {
        "label": "Read: Yule-Walker theory + AR(2) worked example",
        "kind": "read",
        "minutes": 25,
        "instruction": "Read the three-step Yule-Walker method, then the full AR(2) worked example. Pay attention to the correlation-vs-covariance matrix distinction the note flags -- it's a common mark-loss.",
        "noteIds": [
          "ts-yule-walker",
          "ts-yule-walker-worked"
        ],
        "checklistText": "Trace the AR(2) worked example closely, noting where correlation and covariance matrices get mixed up."
      },
      {
        "label": "Write: Yule-Walker template, solved",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book, solve an AR(2) Yule-Walker system from scratch. Then write a reusable one-page template: the three steps, the matrix form â = Ĉ⁻¹v̂, and the noise-variance formula. This is the first half of TS_PackE_estimation_templates.md.",
        "checklistText": "Solve an AR(2) Yule-Walker system closed-book, then draft the reusable template with â = Ĉ⁻¹v̂ and the noise-variance formula."
      },
      {
        "label": "Read: MA(1) estimation worked example",
        "kind": "read",
        "minutes": 20,
        "instruction": "Read the MA(1) moment equations and the mock's worked example, especially the quadratic-root selection step -- why the invertible root is the one kept.",
        "noteIds": [
          "ts-ma1-estimation"
        ],
        "checklistText": "Study the MA(1) worked example and confirm why the invertible root is the one kept, not the other."
      },
      {
        "label": "Write: MA(1) template, solved",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book, solve the MA(1) quadratic for b1 and σ². Then write the second template: ρ(1)=b1/(1+b1²), the quadratic, the |b1|<1 root-selection rule, and the σ² formula. Save both templates together as TS_PackE_estimation_templates.md.",
        "checklistText": "Solve the MA(1) quadratic for b1 and σ² closed-book, then add the second template to TS_PackE_estimation_templates.md."
      }
    ]
  },
  'card-040': {
    "concepts": [
      "AR(1) forecast x̂_{n+h} = μ + aʰ(x_n - μ), with MSE → σ²/(1-a²) as h→∞",
      "AR(p) forecasting by recursive substitution; ARIMA(p,d,q) is differencing + ARMA, SARIMA adds seasonal (P,D,Q)_s"
    ],
    "steps": [
      {
        "label": "Read: AR(1) and AR(p) forecasting",
        "kind": "read",
        "minutes": 30,
        "instruction": "Read the AR(1) closed-form forecast + MSE, then the AR(p) recursive-substitution method. Note why centring before recursing matters -- it's the most common error the note flags.",
        "noteIds": [
          "ts-forecast-ar1",
          "ts-forecast-arp"
        ],
        "checklistText": "Read both forecasting notes and pin down why you must centre the series before recursing for AR(p)."
      },
      {
        "label": "Write: AR forecast + prediction interval, worked",
        "kind": "write",
        "minutes": 25,
        "instruction": "Closed-book, reproduce one AR(1) forecast with a mean plus its prediction interval, and one AR(p) multi-step forecast by recursive substitution with the MSE built from the MA coefficients.",
        "checklistText": "Reproduce one AR(1) forecast with its prediction interval, then an AR(p) multi-step forecast built from MA coefficients, closed-book."
      },
      {
        "label": "Write: ARIMA/SARIMA identification example",
        "kind": "write",
        "minutes": 25,
        "instruction": "Use ts-arima-sarima and Lecture 13: expand ARIMA(1,1,0), forecast it recursively, then expand the lecture's SARIMA(1,0,1)(1,0,0)_12 example and identify the lag-1, lag-12 and lag-13 terms. This tests structure from a stated model, not unsupported order-guessing from a vague description.",
        "resourceIds": [
          "timeSeries-lecture-notes-complete-lecture-13-notes"
        ],
        "noteIds": [
          "ts-arima-sarima"
        ],
        "checklistText": "Expand and forecast ARIMA(1,1,0), then expand the lecture's monthly SARIMA example with its lag-13 cross-term."
      },
      {
        "label": "Self-test: closed-book forecasting + ARIMA/SARIMA",
        "kind": "test",
        "minutes": 25,
        "instruction": "Closed-book: redo both worked items from the previous two steps from memory. Flag anything wrong or hesitant -- this closes out Pack E.",
        "checklistText": "Redo the forecast-with-interval and the ARIMA/SARIMA identification from memory, flagging anything shaky to close out Pack E."
      }
    ]
  },
  'card-044': {
    "concepts": [
      "The real-data workflow: plot -> transform -> ACF/PACF + periodogram -> fit/compare -> forecast",
      "Lecture-faithful model comparison: parameters, noise variance, log-likelihood, and reported AIC",
      "SSA's four stages: embedding, SVD, grouping, diagonal averaging"
    ],
    "steps": [
      {
        "label": "Read: Pack F — L14 real-data workflow",
        "kind": "read",
        "minutes": 40,
        "instruction": "Read the L14 workflow and airline example. Redo the transform logic (log for increasing variance, difference for non-constant mean), then annotate where ACF/PACF, periodogram, candidate fitting, reported-AIC comparison and forecasting enter.",
        "resourceIds": [
          "timeSeries-study-packs-pack-f-l14-l15-real-data-workflow"
        ],
        "noteIds": [
          "ts-real-data-workflow",
          "ts-acf-pacf",
          "ts-aic-model-choice"
        ],
        "checklistText": "Annotate the airline workflow from transform through ACF/PACF, periodogram, candidate comparison, and forecast."
      },
      {
        "label": "Read: Pack F — L15 SSA skeleton",
        "kind": "read",
        "minutes": 25,
        "instruction": "Read the L15 SSA note, then inspect pp.9–11 and 26–36 of the lecture: record the trajectory-matrix shape, the SVD/eigentriple form, grouping/reconstruction, and the recurrent versus vector forecast distinction. Rssa syntax is supporting evidence, not the main learning target.",
        "resourceIds": [
          "timeSeries-study-packs-pack-f-l14-l15-real-data-workflow"
        ],
        "noteIds": [
          "ts-ssa"
        ],
        "checklistText": "Record the SSA matrix shape, eigentriple decomposition, grouping/reconstruction, and two forecast types."
      },
      {
        "label": "Write: hand-redone L14–15 sheet",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book, on one page: the full diagnostic-to-forecast workflow, log-versus-difference rule, ACF/PACF and periodogram cues, the four lecture comparison criteria, and the SSA embedding/SVD/grouping/reconstruction skeleton.",
        "noteIds": [
          "ts-real-data-workflow",
          "ts-acf-pacf",
          "ts-aic-model-choice",
          "ts-ssa"
        ],
        "checklistText": "Fit the full diagnostic/model-choice workflow and the SSA skeleton onto one closed-book page."
      },
      {
        "label": "Flag shaky steps",
        "kind": "do",
        "minutes": 10,
        "instruction": "Mark any line on the sheet you had to check back against the pack instead of writing from recall. Star it — card-047's self-test targets these first.",
        "checklistText": "Star every line you had to check against the pack instead of recalling, for card-047 to target first."
      }
    ]
  },
  'card-047': {
    "concepts": [
      "Comparing candidate models from a supplied Lecture 14 table without inventing unsupported criteria",
      "Reproducing the diagnostic, fitting and forecasting workflow and its R skeleton from memory",
      "SSA embedding/SVD/grouping/reconstruction skeleton"
    ],
    "steps": [
      {
        "label": "Do: AIC comparison worked example",
        "kind": "do",
        "minutes": 25,
        "instruction": "Use a supplied Lecture 14 table (Airpass, Earth temperature, or Nile). Compare two candidate models using parameter count, estimated noise variance, log-likelihood and reported AIC; choose one and justify the trade-off. The lecture reports AIC but does not derive its formula, so do not make formula recall the task.",
        "resourceIds": [
          "timeSeries-study-packs-pack-f-l14-l15-real-data-workflow"
        ],
        "noteIds": [
          "ts-aic-model-choice"
        ],
        "checklistText": "Choose between two candidates from a Lecture 14 table using all four reported comparison criteria."
      },
      {
        "label": "Write: forecasting workflow + R skeleton",
        "kind": "write",
        "minutes": 25,
        "instruction": "From memory, write the workflow and R skeleton: read/plot -> log and/or diff if justified -> acf/pacf + periodogram -> fit several arima() candidates -> compare output -> predict(). Check only after writing it.",
        "noteIds": [
          "ts-real-data-workflow",
          "ts-acf-pacf",
          "ts-aic-model-choice"
        ],
        "checklistText": "Write the transform-diagnose-fit-compare-forecast R skeleton entirely from memory first."
      },
      {
        "label": "Write: SSA algorithm skeleton",
        "kind": "write",
        "minutes": 20,
        "instruction": "From memory, write the trajectory-matrix dimensions, SVD/eigentriple form, grouping and diagonal-averaging reconstruction. Add the names recurrent and vector forecasting; check against the note only after.",
        "noteIds": [
          "ts-ssa"
        ],
        "checklistText": "Write the SSA matrix/SVD/group/reconstruct skeleton and name both forecast types from memory."
      },
      {
        "label": "Self-test: closed-book Pack F recall",
        "kind": "test",
        "minutes": 35,
        "instruction": "Timed, no notes: redo one AIC comparison, the forecasting workflow skeleton, and the SSA skeleton from scratch. Mark anything you blanked on. This closes the TS Packs A–F first pass.",
        "checklistText": "Time yourself redoing the AIC comparison, forecasting skeleton, and SSA skeleton from scratch, no notes."
      }
    ]
  },
  'card-048': {
    "concepts": [
      "Collapsing six pack formula sheets into one recall page, grouped by template",
      "The seven-slot exam template and which formulas serve each slot",
      "A daily 10-minute closed-book recall habit"
    ],
    "steps": [
      {
        "label": "Read: Master formula sheet + exam-shape map",
        "kind": "read",
        "minutes": 15,
        "instruction": "Skim the master formula/R sheet and the question bank once to refresh full A–F coverage, then read the two notes for the compressed formula list and the seven-slot exam map that will decide which formula goes under which group.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet",
          "timeSeries-quick-reference-master-exam-question-bank"
        ],
        "noteIds": [
          "ts-formula-sheet",
          "ts-exam-shape"
        ],
        "checklistText": "Skim the full formula sheet and question bank, then read how the seven exam slots map to each group."
      },
      {
        "label": "Read: the three drill one-pagers",
        "kind": "read",
        "minutes": 10,
        "instruction": "Read all three drills straight through. These ARE the recall content to consolidate, not new material to re-derive.",
        "noteIds": [
          "ts-calculation-drill",
          "ts-definitions-drill",
          "ts-exam-strategy"
        ],
        "checklistText": "Read straight through all three drills, treating them as the recall content itself, not new material to learn."
      },
      {
        "label": "Write: TS_all_formula_recall.md",
        "kind": "write",
        "minutes": 65,
        "instruction": "One line per high-yield formula across Packs A–F, grouped under stationarity, spectral, ARMA/integrated models, estimation, forecasting, and real-data diagnostics. Include the ARIMA/SARIMA operator forms and the smaller-reported-AIC selection rule, but keep SSA as a four-stage skeleton rather than forcing it into a formula.",
        "noteIds": [
          "ts-formula-sheet",
          "ts-calculation-drill",
          "ts-definitions-drill",
          "ts-exam-strategy",
          "ts-exam-shape"
        ],
        "checklistText": "Compile the high-yield formulas plus ARIMA/SARIMA, model-choice, and SSA skeletons into TS_all_formula_recall.md."
      },
      {
        "label": "Store + first daily recall pass",
        "kind": "do",
        "minutes": 15,
        "instruction": "Save/print the sheet, then immediately run the first 10-minute closed-book recall pass against it and mark any group that's still shaky.",
        "checklistText": "Save the sheet, then run a 10-minute closed-book recall pass against it and mark any weak group."
      }
    ]
  },
  'card-052': {
    "concepts": [
      "Smoothing/decomposition formulas: SMA, CMA, WMA, SES",
      "WSS definition and the five covariance properties (R(0), |R(t)|<=R(0), symmetry)",
      "Named-process covariance formulas (random walk, Wiener, Brownian bridge)",
      "Timed, closed-book template discipline (Pass 2 behaviour, not re-learning)"
    ],
    "steps": [
      {
        "label": "Read: pick 4 templates (recall pass only)",
        "kind": "read",
        "minutes": 15,
        "instruction": "This is drilling, not re-learning: use the question bank (organised by template) to pick exactly one exam-style question each for smoothing, decomposition, WSS, and one named-process covariance. Spend under 4 minutes per note just to refresh the formula, not to re-study the pack.",
        "resourceIds": [
          "timeSeries-quick-reference-master-exam-question-bank"
        ],
        "noteIds": [
          "ts-smoothing",
          "ts-wss",
          "ts-formula-sheet"
        ],
        "checklistText": "Pick one exam question each for smoothing, decomposition, WSS, and a named-process covariance from the question bank."
      },
      {
        "label": "Do: sit all 4 to time, closed-book",
        "kind": "do",
        "minutes": 65,
        "instruction": "No notes, no formula sheet. Budget ~16 minutes per template and write down the actual clock time you finish each one — that per-template timing is the evidence this card needs, not just correctness.",
        "checklistText": "Sit all four questions closed-book at roughly 16 minutes each, logging the actual clock time you finish every one."
      },
      {
        "label": "Write: mark, rewrite broken, log timing",
        "kind": "write",
        "minutes": 40,
        "instruction": "Mark all 4 against the master formula/R-code sheet. For any template that broke, rewrite it clean from a blank page (not copied from the sheet). Log the per-template timing and pass/fail into the TS error log.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet"
        ],
        "checklistText": "Mark all four against the master sheet, rewrite any broken template from a blank page, and log the results."
      }
    ]
  },
  'card-055': {
    "concepts": [
      "Spectral density -> covariance recovery via the cosine transform",
      "BLUP derivation: Sigma^-1 * b and the prediction-variance formula",
      "Causality root test on a(z) (roots strictly outside the unit circle)",
      "AR model -> covariance/variance, forward direction (given coefficients, find R(k))"
    ],
    "steps": [
      {
        "label": "Read: pick 4 templates (recall pass only)",
        "kind": "read",
        "minutes": 15,
        "instruction": "Quick formula-recall pass only, ~3 minutes per note — pick one question per template (spectral->covariance, BLUP, causality root-check, AR->covariance) from the question bank, then close the notes before sitting.",
        "resourceIds": [
          "timeSeries-quick-reference-master-exam-question-bank"
        ],
        "noteIds": [
          "ts-spectrum-covariance",
          "ts-blup-worked",
          "ts-causality",
          "ts-yule-walker-worked"
        ],
        "checklistText": "Pick one question each for spectral-to-covariance, BLUP, causality root-check, and AR-to-covariance from the question bank."
      },
      {
        "label": "Do: sit all 4 to time, closed-book",
        "kind": "do",
        "minutes": 70,
        "instruction": "No notes. Treat each as a ~17-minute exam sub-part; write the actual time spent per template as you finish it, not afterward from memory.",
        "checklistText": "Sit all four as roughly 17-minute exam sub-parts, recording the actual time spent on each as you finish it."
      },
      {
        "label": "Write: mark, rewrite broken, log timing",
        "kind": "write",
        "minutes": 35,
        "instruction": "Mark every attempt against the master formula/R-code sheet. Rewrite any broken template clean from scratch, and log the 4 per-template timings into the TS error log.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet"
        ],
        "checklistText": "Mark every attempt against the master sheet, rewrite any broken template from scratch, and log all four timings."
      }
    ]
  },
  'card-058': {
    "concepts": [
      "Full timed attempt of an older-format paper: choose 3 of 4 questions, 25 marks each",
      "Self-marking against templates when no year-specific solution key exists",
      "Seeding the first TS error-log entries from a live paper"
    ],
    "steps": [
      {
        "label": "Do: sit the 2015 paper (paper #1), timed",
        "kind": "do",
        "minutes": 120,
        "instruction": "Attempt the 2015 paper — paper #1 in the seven-paper sequence across cards 058/068/081/089/095/113/118. This older paper presents four 25-mark questions; choose any three and sit the full 2 hours under closed-book conditions, with only the calculator and other aids stated on the paper.",
        "resourceIds": [
          "timeSeries-past-papers-2015-past-exam-paper"
        ],
        "checklistText": "Choose three of the four 2015 questions and sit them closed-book under the full 2-hour limit."
      },
      {
        "label": "Test: mark and tag every sub-part",
        "kind": "test",
        "minutes": 20,
        "instruction": "There is no dedicated worked-solution file for the 2015 paper in this kit (only the mock has one) — self-mark against the master formula/R-code sheet, and use the past-paper/mock mapping audit to see which template each question maps to. Tag every sub-part right / partial / blank.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet",
          "timeSeries-quick-reference-past-paper-and-mock-mapping-audit"
        ],
        "checklistText": "Self-mark against the master sheet using the mapping audit, tagging every sub-part right, partial, or blank."
      },
      {
        "label": "Write: record score + broken templates",
        "kind": "write",
        "minutes": 10,
        "instruction": "Record the total score and list every broken template by name. Push all of them into the TS error log for card-063 to mine next.",
        "checklistText": "Record the total score and push every broken template by name into the TS error log for card-063."
      }
    ]
  },
  'card-063': {
    "concepts": [
      "Re-deriving dropped marks from a blank page rather than reading solutions passively",
      "Classifying mistakes as knowledge vs technique vs time",
      "Feeding gaps into the TS error log and formula recall sheet"
    ],
    "steps": [
      {
        "label": "Do: rework every dropped mark",
        "kind": "do",
        "minutes": 40,
        "instruction": "Re-derive every question from paper #1 where you dropped a mark, fully from a blank page. Use these three consolidated drill sheets to jump straight to the right method or formula rather than re-reading full lecture notes.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet"
        ],
        "noteIds": [
          "ts-calculation-drill",
          "ts-proof-drill",
          "ts-definitions-drill"
        ],
        "checklistText": "Re-derive every paper #1 mistake from a blank page using the three consolidated drill sheets."
      },
      {
        "label": "Write: tag + update error log",
        "kind": "write",
        "minutes": 20,
        "instruction": "Tag each reworked question as knowledge / technique / time. Push unresolved knowledge gaps into the TS error log and any missed formula onto your recall sheet, cross-checking the mapping audit for which template each question actually was.",
        "resourceIds": [
          "timeSeries-quick-reference-past-paper-and-mock-mapping-audit"
        ],
        "checklistText": "Tag each reworked question as knowledge, technique, or time, then log unresolved gaps into the TS error log."
      },
      {
        "label": "Self-test: cold re-derive the hardest one",
        "kind": "test",
        "minutes": 15,
        "instruction": "Closed book, no drill sheets: re-derive the single hardest reworked question again from memory only, to confirm the fix actually stuck rather than just having been copied once.",
        "checklistText": "Closed-book, re-derive only the single hardest reworked question from memory to confirm the fix stuck."
      }
    ]
  },
  'card-066': {
    "concepts": [
      "Yule-Walker estimation (data -> AR parameters and noise variance)",
      "AR forecasting with prediction intervals",
      "ARIMA/SARIMA structure plus ACF/PACF/periodogram diagnostic evidence",
      "Reported-AIC comparison balanced against parameter count, noise variance, and log-likelihood"
    ],
    "steps": [
      {
        "label": "Read: pick 4 templates (recall pass only)",
        "kind": "read",
        "minutes": 15,
        "instruction": "Quick recall pass; pick one question per template — Yule-Walker estimation, AR forecast with bounds, ARIMA/SARIMA structure, and Lecture 14 model comparison. Use the dedicated notes to state each method before attempting the question.",
        "resourceIds": [
          "timeSeries-quick-reference-master-exam-question-bank"
        ],
        "noteIds": [
          "ts-yule-walker",
          "ts-forecast-ar1",
          "ts-arima-sarima",
          "ts-acf-pacf",
          "ts-aic-model-choice"
        ],
        "checklistText": "Pick one question each for Yule-Walker, AR forecast with bounds, integrated/seasonal structure, and model comparison."
      },
      {
        "label": "Do: sit all 4 to time, closed-book",
        "kind": "do",
        "minutes": 75,
        "instruction": "No notes. Budget ~18-19 minutes per template closed-book.",
        "checklistText": "Sit all four chosen questions closed-book, timing yourself to roughly 18-19 minutes per template."
      },
      {
        "label": "Write: mark and rewrite broken templates",
        "kind": "write",
        "minutes": 30,
        "instruction": "Mark against the master formula/R-code sheet and the four dedicated knowledge notes. Rewrite any broken template clean from a blank page and name the exact failure in the TS error log.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet"
        ],
        "checklistText": "Mark against the master formula/R-code sheet and rewrite any broken template from a blank page."
      }
    ]
  },
  'card-068': {
    "concepts": [
      "Full older-format paper conditions: choose 3 of 4 questions, 25 marks each, 75 attempted marks",
      "Tagging every part right/partial/blank so the error log drives future repair, not just a raw score"
    ],
    "steps": [
      {
        "label": "Do: sit the 2016 paper, timed",
        "kind": "do",
        "minutes": 120,
        "instruction": "This is paper #2, following the 2015 paper in card-058. The 2016 paper presents four 25-mark questions: choose any three, work closed-book with only the aids stated on the paper, and timebox each attempted question to about 40 minutes.",
        "resourceIds": [
          "timeSeries-past-papers-2016-past-exam-paper"
        ],
        "checklistText": "Choose three of the four 2016 questions and sit them closed-book at about 40 minutes per question."
      },
      {
        "label": "Test: self-mark + log",
        "kind": "test",
        "minutes": 30,
        "instruction": "There's no official answer key for the raw 2016 paper, so mark against the mapping audit's template list plus your own formula/proof/R-code drill pages. Tag every part right/partial/blank, record the paper #2 score, and add every broken template to the TS error log.",
        "resourceIds": [
          "timeSeries-quick-reference-past-paper-and-mock-mapping-audit"
        ],
        "checklistText": "Mark against the mapping audit and drill pages, tag each part, and log broken templates to the TS error log."
      }
    ]
  },
  'card-071': {
    "concepts": [
      "Mining a marked paper for the exact broken template, not just the general topic",
      "The full TS formula sheet as one closed-book recall unit"
    ],
    "steps": [
      {
        "label": "Write: rework every dropped mark from paper #2",
        "kind": "write",
        "minutes": 35,
        "instruction": "Pull the 2016 paper and your card-068 marking. For every part tagged partial or blank, redo it in full — write the corrected working, don't just read the fix. Use the calculation-drill and proof-drill pages as your answer key.",
        "resourceIds": [
          "timeSeries-past-papers-2016-past-exam-paper"
        ],
        "noteIds": [
          "ts-calculation-drill",
          "ts-proof-drill"
        ],
        "checklistText": "Redo every 2016 paper part marked partial or blank, using the calculation and proof drill pages as your key."
      },
      {
        "label": "Write: update the TS error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Log the broken templates by slot (i)-(vii) so later repair cards target the same weak spots instead of re-reading broadly.",
        "checklistText": "Log each broken template by its exam slot, (i) through (vii), into the TS error log."
      },
      {
        "label": "Test: closed-book formula recall pass",
        "kind": "test",
        "minutes": 30,
        "instruction": "Set a timer for 10 minutes and write the entire TS formula sheet from memory, closed book. Then open ts-formula-sheet (and the master sheet for anything it doesn't cover) and mark every gap or error in red — these become today's highest-priority repairs.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet"
        ],
        "noteIds": [
          "ts-formula-sheet"
        ],
        "checklistText": "Write the entire TS formula sheet from memory in 10 minutes, then mark every gap in red against the reference sheets."
      }
    ]
  },
  'card-074': {
    "concepts": [
      "Strict stationarity + finite 2nd moment implies WSS, via the shift s = -t2 trick",
      "AR(2) causality as the root test on a(z), argued through the coefficient triangle",
      "Yule-Walker: correlation recursion to matrix solve to the noise-variance formula"
    ],
    "steps": [
      {
        "label": "Read: the 3 source proofs + the proof-drill page",
        "kind": "read",
        "minutes": 15,
        "instruction": "Skim ts-proof-drill's one-line ideas for WSS, causality, and Yule-Walker first — that's the compressed exam version. Then check whichever full source note (ts-wss-proof, ts-causality, ts-yule-walker) you don't already recall cold.",
        "noteIds": [
          "ts-proof-drill",
          "ts-wss-proof",
          "ts-causality",
          "ts-yule-walker"
        ],
        "checklistText": "Skim the proof-drill's one-line summaries for WSS, causality, and Yule-Walker, then check any you don't recall cold."
      },
      {
        "label": "Write: the 3 proof skeletons",
        "kind": "write",
        "minutes": 50,
        "instruction": "Into TS_proof_skeletons.md, write out full skeletons from memory plus what you just read: (1) strict stationarity + finite 2nd moment implies WSS, (2) the AR(2) causality root argument, (3) the Yule-Walker derivation (correlation recursion + noise-variance formula). One clearly labelled step per line.",
        "checklistText": "Write full memory skeletons for the WSS implication proof, the AR(2) causality argument, and the Yule-Walker derivation into TS_proof_skeletons.md."
      },
      {
        "label": "Test: timed closed-book reproduction",
        "kind": "test",
        "minutes": 40,
        "instruction": "Close every note. Reproduce all 3 skeletons from scratch, roughly 13 minutes each. Compare against your written version line by line and flag any skeleton you couldn't finish for tomorrow's repair pass.",
        "checklistText": "Reproduce all three proof skeletons from scratch in about 13 minutes each, then flag any unfinished one for tomorrow."
      }
    ]
  },
  'card-077': {
    "concepts": [
      "The 5 R templates covering ~10 marks/paper: Gaussian/ARMA simulation, BLUP forecast+CI, correlogram/periodogram",
      "arima() fitting plus correlogram-based order diagnostics (slow decay = AR, sharp cutoff = MA)",
      "Mechanical traps: rnorm's sd argument, the AR sign-flip on rearrangement, t(chol(S))"
    ],
    "steps": [
      {
        "label": "Read: the R-code drill sheet",
        "kind": "read",
        "minutes": 10,
        "instruction": "Read the 5-template table and the 5 recurring traps once. This one page is the entire R portion of the paper — about 10 marks.",
        "noteIds": [
          "ts-r-code-drill"
        ],
        "checklistText": "Read the R drill sheet's five templates and five recurring traps once, since it covers the whole R portion."
      },
      {
        "label": "Write: R skeletons — fit/diagnostics, simulate, forecast",
        "kind": "write",
        "minutes": 35,
        "instruction": "Into TS_R_skeletons.md, write all three cold: the arima(y, order=c(p,d,q)) fit plus the correlogram-decay diagnostic, the ARMA simulation loop, and the BLUP forecast-with-CI code. Only reach for the cheat sheet for residual-diagnostic syntax the notes don't cover.",
        "resourceIds": [
          "timeSeries-quick-reference-r-comprehensive-cheat-sheet"
        ],
        "noteIds": [
          "ts-real-data-workflow",
          "ts-arma-sim-r",
          "ts-forecast-r-code"
        ],
        "checklistText": "Write the arima() fit, ARMA simulation loop, and BLUP forecast-with-CI code from memory into TS_R_skeletons.md."
      },
      {
        "label": "Do: 5 mixed questions spanning packs",
        "kind": "do",
        "minutes": 20,
        "instruction": "Pull 5 questions spanning different packs/templates (not just R) from the master question bank. Attempt all 5 closed-book.",
        "resourceIds": [
          "timeSeries-quick-reference-master-exam-question-bank"
        ],
        "checklistText": "Attempt five closed-book questions pulled from different packs and templates across the master question bank."
      },
      {
        "label": "Test: mark + log",
        "kind": "test",
        "minutes": 10,
        "instruction": "Mark the 5 mixed questions and log the results, plus any newly-broken template, into the TS error log.",
        "checklistText": "Mark the five mixed questions and log any newly-broken template into the TS error log."
      }
    ]
  },
  'card-081': {
    "concepts": [
      "Third full past-paper attempt in the seven-paper run, under genuine 2-hour timing",
      "Converting a marked paper into a template-level error-log update"
    ],
    "steps": [
      {
        "label": "Do: sit the 2017 paper, timed",
        "kind": "do",
        "minutes": 120,
        "instruction": "Paper #3 follows 2015 (card-058) and 2016 (card-068). The 2017 paper presents four 25-mark questions: choose any three, run the full 2 hours closed-book with only the stated aids, and timebox each attempted question to about 40 minutes.",
        "resourceIds": [
          "timeSeries-past-papers-2017-past-exam-paper"
        ],
        "checklistText": "Choose three of the four 2017 questions and sit them closed-book at about 40 minutes per question."
      },
      {
        "label": "Test: self-mark + log",
        "kind": "test",
        "minutes": 35,
        "instruction": "Self-mark against the mapping audit plus your formula/proof/R-code drills. Tag every attempted part right/partial/blank, record the paper #3 score, and add every broken template to the error log so the later repair cards target it.",
        "resourceIds": [
          "timeSeries-quick-reference-past-paper-and-mock-mapping-audit"
        ],
        "checklistText": "Mark against the mapping audit and drills, record the paper #3 score, and honestly log every broken template."
      }
    ]
  },
  'card-089': {
    "concepts": [
      "Sit a full closed-book Time Series paper (the 2018 real past paper) under genuine 2-hour timing",
      "Mark strictly against the exam's seven-slot template ((i) definition … (vii) spectral/Yule-Walker), not a vague impression of how it went",
      "Log every broken question-template by name in the TS error log, not just 'ARMA was hard'"
    ],
    "steps": [
      {
        "label": "Do: sit the 2018 past paper, closed-book, 2h",
        "kind": "do",
        "minutes": 120,
        "instruction": "This is paper #4 of the seven-paper TS run (2015-2017 were #1-#3; 2019, 2020, and the mock follow as #5-#7). The 2018 paper presents four 25-mark questions: choose any three, use no aids beyond those stated on the paper, and timebox each attempted question to about 40 minutes.",
        "resourceIds": [
          "timeSeries-past-papers-2018-past-exam-paper"
        ],
        "checklistText": "Sit the 2018 paper closed-book, answering three 25-mark questions and timeboxing each to about 40 minutes."
      },
      {
        "label": "Test: mark, tag right/partial/blank, record score",
        "kind": "test",
        "minutes": 30,
        "instruction": "The 2015-2020 real papers have no official solution PDF (only the mock exam does), so mark yourself against the question bank (organised by template) and the past-paper/mock mapping audit to identify which recurring template each part was. Tag every part right / partial / blank, then write down the paper #4 score as a single number so trend across papers #1-#4 is visible later.",
        "resourceIds": [
          "timeSeries-quick-reference-master-exam-question-bank",
          "timeSeries-quick-reference-past-paper-and-mock-mapping-audit"
        ],
        "checklistText": "Mark against the question bank and mapping audit, tag each part, and record the paper #4 score for the trend."
      },
      {
        "label": "Write: update the TS error log",
        "kind": "write",
        "minutes": 15,
        "instruction": "For every part tagged partial or blank, add the specific template name (e.g. 'MA(1) parameter estimation', 'BLUP with bounds') to the error log, not the general topic. This is the list card-092 repairs from next.",
        "checklistText": "Add the specific template name for every partial or blank part, not the general topic, to the error log."
      }
    ]
  },
  'card-092': {
    "concepts": [
      "Identify the true 3 weakest templates from the paper #4 error log — not a general re-read of the module",
      "Re-derive or recompute each from the bare method name, closed-book, before checking any note",
      "Confirm each is clean with a second closed-book pass before ticking it off the error log"
    ],
    "steps": [
      {
        "label": "Do: re-derive the 3 weakest templates cold",
        "kind": "do",
        "minutes": 55,
        "instruction": "Pull exactly the 3 templates card-089's error log flagged as broken. For each, attempt it cold on paper from the method name alone first, THEN check against whichever of these four drill notes matches it (proof drill for derivations, calculation drill for computations, R-code drill for the R parts, definitions drill for a slot-(i) recall miss) — don't read all four, only the ones matching your actual 3 gaps.",
        "noteIds": [
          "ts-proof-drill",
          "ts-calculation-drill",
          "ts-r-code-drill",
          "ts-definitions-drill"
        ],
        "checklistText": "Attempt each of the 3 flagged templates cold on paper first, then check only the drill note that matches your gap."
      },
      {
        "label": "Test: closed-book re-test on just those 3",
        "kind": "test",
        "minutes": 35,
        "instruction": "Cover everything and redo all 3 templates a second time from scratch, no peeking. Compare against your first attempt: is the method now automatic, or did you still need to think it through?",
        "checklistText": "Redo all 3 templates closed-book from scratch, no peeking, and check whether the method now feels automatic."
      },
      {
        "label": "Write: tick the error log clean",
        "kind": "write",
        "minutes": 15,
        "instruction": "Only tick off a template if the second cold pass was clean. Anything still shaky stays open and rolls forward rather than being marked done.",
        "checklistText": "Tick off only the templates whose second cold pass came out clean, leaving anything shaky open."
      }
    ]
  },
  'card-095': {
    "concepts": [
      "Sit a full closed-book Time Series paper (the 2019 real past paper) under genuine 2-hour timing",
      "Mark strictly against the exam's seven-slot template, not a vague impression of how it went",
      "Log every broken question-template by name in the TS error log"
    ],
    "steps": [
      {
        "label": "Do: sit the 2019 past paper, closed-book, 2h",
        "kind": "do",
        "minutes": 120,
        "instruction": "This is paper #5 of the seven-paper run (2015-2018 were #1-#4; 2020 and the mock follow as #6/#7). The 2019 paper presents four 25-mark questions: choose any three, work closed-book with only the stated aids, and use the full 2 hours.",
        "resourceIds": [
          "timeSeries-past-papers-2019-past-exam-paper"
        ],
        "checklistText": "Sit the 2019 paper closed-book as paper #5 of 7, three questions in 2 hours, no notes allowed."
      },
      {
        "label": "Test: mark, tag right/partial/blank, record score",
        "kind": "test",
        "minutes": 30,
        "instruction": "No official solution exists for the 2019 paper, so self-mark using the question bank and the mapping audit to place each part against its recurring template. Tag right / partial / blank per part and record the paper #5 score.",
        "resourceIds": [
          "timeSeries-quick-reference-master-exam-question-bank",
          "timeSeries-quick-reference-past-paper-and-mock-mapping-audit"
        ],
        "checklistText": "Self-mark using the question bank and mapping audit, tagging each part right, partial, or blank."
      },
      {
        "label": "Write: update the TS error log",
        "kind": "write",
        "minutes": 15,
        "instruction": "Log every broken template by its specific name. card-099 repairs the top 3 from this list next.",
        "checklistText": "Log every broken template by name in the TS error log for card-099 to repair next."
      }
    ]
  },
  'card-099': {
    "concepts": [
      "Repair exactly 3 named weak templates from paper #5's error log — not a broad re-read",
      "Reproduce the full formula sheet cold in a strict 10-minute window and mark every gap honestly",
      "Only tick the error log once both the repair and the recall gap are closed"
    ],
    "steps": [
      {
        "label": "Do: repair the 3 weakest TS templates",
        "kind": "do",
        "minutes": 55,
        "instruction": "Take the 3 templates card-095's error log flagged as still broken. Attempt each cold first, then check against whichever drill note matches (proof / calculation / R-code / definitions) — only the ones your 3 gaps actually need.",
        "noteIds": [
          "ts-proof-drill",
          "ts-calculation-drill",
          "ts-r-code-drill",
          "ts-definitions-drill"
        ],
        "checklistText": "Attempt the 3 templates card-095 flagged cold first, then check only the drill note matching your gap."
      },
      {
        "label": "Test: 10-min full formula recall, closed-book",
        "kind": "test",
        "minutes": 10,
        "instruction": "Set a 10-minute timer. Write out, from memory only, every formula block: stationarity/moments, the named-process covariances, the spectral identities, the ARMA polynomials and causality/invertibility tests, forecasting (BLUP + AR(1)), and Yule-Walker estimation. Do not check anything until the timer stops.",
        "checklistText": "In 10 minutes, write every formula block from memory: moments, covariances, spectral identities, ARMA, and Yule-Walker."
      },
      {
        "label": "Read: mark the recall against ts-formula-sheet",
        "kind": "read",
        "minutes": 25,
        "instruction": "Line up your 10-minute page against ts-formula-sheet and circle every formula you missed or got wrong. This is a real gap list, not a formality — anything circled needs a second look before the exam.",
        "noteIds": [
          "ts-formula-sheet"
        ],
        "checklistText": "Line up your recall page against the formula sheet and circle every formula you missed or got wrong."
      },
      {
        "label": "Write: tick the error log clean",
        "kind": "write",
        "minutes": 15,
        "instruction": "Tick the 3 repaired templates off only if today's cold attempt was clean, and add any formula circled in the recall as a new, separate error-log line so it doesn't get lost before the exam-eve sheet (card-116).",
        "checklistText": "Tick off only the cleanly repaired templates, and add any circled formula as a new error-log line."
      }
    ]
  },
  'card-102': {
    "concepts": [
      "Reproduce 3 banked proof skeletons cold (e.g. positive semidefiniteness, AR(2) causality triangle, BLUP derivation), no peeking first",
      "Reproduce the Gaussian-process/ARMA-simulation and BLUP-forecast R skeletons cold",
      "Any skeleton that wobbles gets rewritten until it is automatic, not just reviewed"
    ],
    "steps": [
      {
        "label": "Test: reproduce 3 proof skeletons closed-book",
        "kind": "test",
        "minutes": 45,
        "instruction": "Pick 3 proofs from ts-proof-drill's table (the PSD-positive-semidefinite proof, the AR(2) causality triangle, and the BLUP derivation cover the highest exam value). Write each out cold from the one-line idea alone, then check line-by-line against the note. This intentionally reuses the same note card-074 built its proof drill around — the content doesn't change, only the closed-book standard you're holding yourself to now.",
        "noteIds": [
          "ts-proof-drill"
        ],
        "checklistText": "Write the PSD, AR(2) causality, and BLUP proofs cold from a one-line cue, then check them line by line."
      },
      {
        "label": "Do: reproduce ARMA/forecast R skeletons closed-book",
        "kind": "do",
        "minutes": 40,
        "instruction": "From memory, write the Gaussian-process Cholesky simulation, the ARMA `for`-loop simulation, and the BLUP forecast-with-CI code (`solve(Sigma, b)`). Then check against ts-r-code-drill line by line, specifically for the five recurring traps it lists (sd vs variance in rnorm, t(chol()), loop bounds at p+1, etc). Same note card-077's R-code drill uses — this is the final cold pass, not new material.",
        "noteIds": [
          "ts-r-code-drill"
        ],
        "checklistText": "Write the Cholesky simulation, ARMA loop, and BLUP forecast R code from memory, then check for the 5 recurring traps."
      },
      {
        "label": "Write: fix anything that wobbled",
        "kind": "write",
        "minutes": 20,
        "instruction": "For any proof or R skeleton that needed a peek or a correction, rewrite it a second time from scratch, no notes, until it comes out clean in one pass.",
        "checklistText": "Rewrite any proof or R skeleton that needed a peek, from scratch, until it comes out clean in one pass."
      }
    ]
  },
  'card-113': {
    "concepts": [
      "Sit a full closed-book Time Series paper (the 2020 real past paper — the last of the 6 real years) under genuine 2-hour timing",
      "Mark strictly against the exam's seven-slot template, not a vague impression of how it went",
      "Log every broken question-template by name in the TS error log"
    ],
    "steps": [
      {
        "label": "Do: sit the 2020 past paper, closed-book, 2h",
        "kind": "do",
        "minutes": 120,
        "instruction": "This is paper #6 and the final real past-year paper in the plan; the mock in card-118 is #7. The 2020 paper presents four 25-mark questions: choose any three and sit the full 2 hours closed-book with only the stated aids. Some knowledge notes work through 2020-paper methods, so preserve the diagnostic value by completing the paper before opening those notes.",
        "resourceIds": [
          "timeSeries-past-papers-2020-past-exam-paper"
        ],
        "checklistText": "Sit the 2020 paper closed-book as the 6th and final real past-year paper, three questions in 2 hours."
      },
      {
        "label": "Test: mark, tag right/partial/blank, record score",
        "kind": "test",
        "minutes": 30,
        "instruction": "No separate solution PDF exists for the 2020 paper, but several of your own knowledge notes (e.g. ts-blup-derivation, ts-ma-representation, ts-yule-walker-worked) already work through specific 2020 questions in full — use those plus the question bank and mapping audit to mark accurately. Tag each part and record the score.",
        "resourceIds": [
          "timeSeries-quick-reference-master-exam-question-bank",
          "timeSeries-quick-reference-past-paper-and-mock-mapping-audit"
        ],
        "checklistText": "Mark using ts-blup-derivation, ts-ma-representation, and ts-yule-walker-worked alongside the question bank and mapping audit."
      },
      {
        "label": "Write: update the TS error log",
        "kind": "write",
        "minutes": 15,
        "instruction": "Log every broken template by name. This is the last full-paper error log before the final recall pass (card-116) and the mock (card-118).",
        "checklistText": "Log every broken template by name, since this is the last full-paper error log before the final recall pass."
      }
    ]
  },
  'card-116': {
    "concepts": [
      "Full closed-book, timed recall of every formula on ts-formula-sheet",
      "Any proof skeleton still shaky after card-102 gets one more cold reproduction",
      "Compress everything still needed into a single exam-eve page — no filler, no restating what's already solid"
    ],
    "steps": [
      {
        "label": "Test: full formula recall, closed-book",
        "kind": "test",
        "minutes": 20,
        "instruction": "From memory only, write out every formula block on one page: stationarity/moments, named-process covariances, spectral identities, ARMA polynomials and the causality/invertibility tests, BLUP + AR(1) forecasting, Yule-Walker. Time yourself but don't stop early even if it's slow — completeness matters more than speed here.",
        "checklistText": "Write out every formula block from memory on one page, without stopping early even if it feels slow."
      },
      {
        "label": "Read: mark against ts-formula-sheet",
        "kind": "read",
        "minutes": 15,
        "instruction": "Circle every formula missed or wrong. Anything circled twice across this campaign (also flagged in card-099) is a priority for the exam-eve sheet below.",
        "noteIds": [
          "ts-formula-sheet"
        ],
        "checklistText": "Circle every formula you missed against the sheet, prioritizing anything also flagged back in card-099."
      },
      {
        "label": "Do: reproduce any still-shaky proof skeleton",
        "kind": "do",
        "minutes": 30,
        "instruction": "From card-102's final drill, take only the proof(s) that still wobbled and reproduce them cold once more against ts-proof-drill. If everything from card-102 was already clean, spend this time instead on whichever formula was circled twice in the previous step.",
        "noteIds": [
          "ts-proof-drill"
        ],
        "checklistText": "Redo cold whichever proof from card-102 still wobbled, or drill the formula circled twice instead."
      },
      {
        "label": "Write: the 1-page exam-eve sheet",
        "kind": "write",
        "minutes": 40,
        "instruction": "Condense today's circled formulas and any still-shaky proof into a single page — cross-check coverage against the master formula/R sheet and the paper/template mapping audit so nothing high-frequency is missing, but do not copy either wholesale. This sheet is for your own last-look use, not for the (closed-book) exam itself.",
        "resourceIds": [
          "timeSeries-quick-reference-master-formula-and-r-code-sheet",
          "timeSeries-quick-reference-past-paper-and-mock-mapping-audit"
        ],
        "checklistText": "Condense today's circled formulas and any shaky proof into one page, cross-checked against the master sheet and mapping audit."
      }
    ]
  },
  'card-118': {
    "concepts": [
      "Sit the mock exam — the closest full dry run to the real exam format — closed-book and timed",
      "Mark against the official mock solution, part by part",
      "This is the last timed sit before the real exam: log honestly, there is no further TS repair slot after this"
    ],
    "steps": [
      {
        "label": "Do: sit the mock exam, closed-book, 2h",
        "kind": "do",
        "minutes": 120,
        "instruction": "This mock is paper #7 and the final item in the seven-paper run, after the six real papers from 2015-2020. Unlike those older papers, the current mock instructs you to answer all three 25-mark questions and has an official worked solution. Sit it closed-book for the full 2 hours as the closest available rehearsal of the current format.",
        "resourceIds": [
          "timeSeries-past-papers-mock-exam"
        ],
        "checklistText": "Sit the mock exam closed-book as your final rehearsal, three questions, 25 marks each, in 2 hours."
      },
      {
        "label": "Test: mark against the official mock solution",
        "kind": "test",
        "minutes": 35,
        "instruction": "Mark line by line against the real worked solution this time — no guessing at templates. Tag every part right / partial / blank and record the final score.",
        "resourceIds": [
          "timeSeries-past-papers-mock-exam-solution"
        ],
        "checklistText": "Mark line by line against the official mock solution and tag every part right, partial, or blank."
      },
      {
        "label": "Write: final TS error-log update",
        "kind": "write",
        "minutes": 10,
        "instruction": "Log anything still broken. This is the last scheduled TS past-paper card — whatever's left open here needs a personal fix in whatever spare time remains before the real exam, since no further repair card follows it.",
        "checklistText": "Log anything still broken, since this is the last scheduled repair chance before the real exam."
      }
    ]
  },
  'mat700-foundation-reset': {
    "concepts": [
      "MAT700 exam structure: 2-hour written paper, answer 3 of 4 questions, one A4 crib sheet (both sides) allowed",
      "What 'ready' means here: dashboard of all 7 lectures/3 tutorials indexed, an empty error log, and a written pass rule"
    ],
    "steps": [
      {
        "label": "Read: exam shape and scope",
        "kind": "read",
        "minutes": 8,
        "instruction": "Read the exam-shape note once. Note the format (2h, 4 questions, answer 3), the marks (75 total), and what you're allowed to bring in. Write one line: your working target score/grade.",
        "noteIds": [
          "m7-exam-shape"
        ],
        "checklistText": "Read the exam-shape note once and write one line stating your working target score or grade."
      },
      {
        "label": "Inventory: lectures, tutorials, solutions, question banks",
        "kind": "do",
        "minutes": 8,
        "instruction": "Open the MAT700 module in the dashboard and confirm Lectures 1-7 (slides + notes), Tutorials 1-3 (+ solutions), and all 7 question banks resolve and open. Flag anything missing now, not mid-rebuild.",
        "checklistText": "Open the MAT700 dashboard and confirm all 7 lectures, 3 tutorials, and 7 question banks actually open."
      },
      {
        "label": "Create the MAT700 error log",
        "kind": "write",
        "minutes": 6,
        "instruction": "Make one blank log (any note/doc) with columns: lecture, question/prompt, what you got wrong, the correct version, date. This is the single log every rebuild-L1..L4 card feeds into.",
        "checklistText": "Create one blank error log with columns for lecture, question, your mistake, the fix, and date."
      },
      {
        "label": "Write the pass rule",
        "kind": "write",
        "minutes": 8,
        "instruction": "Write one short paragraph and pin it: tutorials/question banks come before rereading slides, every attempt is timed and self-marked strictly against the solutions, and every miss goes straight into the error log.",
        "checklistText": "Write and pin the pass rule: question banks before slides, every attempt timed and self-marked, misses logged."
      }
    ]
  },
  'mat700-rebuild-l1': {
    "concepts": [
      "Data mining vs statistics, and when machine learning is (and isn't) the right tool",
      "Bonferroni's principle and the birthday-triples expected-count calculation",
      "Labelled vs unlabelled data: classification/regression vs clustering/association"
    ],
    "steps": [
      {
        "label": "Skim: Lecture 1 notes + slides",
        "kind": "read",
        "minutes": 25,
        "instruction": "Skim the slides/notes once for structure only, then read the four linked notes closely — they carry the exact exam-tested wording for the definitions and the birthday-triples method.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-1-notes",
          "mat700-lecture-slides-lecture-1-slides",
          "mat700-lecture-slides-lecture-1-supplement"
        ],
        "noteIds": [
          "m7-what-is-data-mining",
          "m7-bonferroni",
          "m7-birthday-triples",
          "m7-labelled-unlabelled"
        ],
        "checklistText": "Read the four linked notes closely enough to recite the birthday-triples formula and Bonferroni's principle verbatim."
      },
      {
        "label": "Write: L1 one-page sheet from memory",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book: write the data-mining-vs-statistics contrast, Bonferroni's informal statement, the birthday-triples formula worked for one K, and the labelled/unlabelled split with task examples. Check against the notes only after.",
        "noteIds": [
          "m7-what-is-data-mining",
          "m7-bonferroni",
          "m7-birthday-triples",
          "m7-labelled-unlabelled"
        ],
        "checklistText": "From memory, write out the birthday-triples formula worked for one K value before checking the notes."
      },
      {
        "label": "Test: Lecture 1 question bank, closed book",
        "kind": "test",
        "minutes": 25,
        "instruction": "Answer every prompt before looking at any solution. Mark yourself strictly against the question bank's own answers.",
        "resourceIds": [
          "mat700-question-banks-lecture-1-question-bank"
        ],
        "checklistText": "Answer every question in the Lecture 1 question bank closed-book, then mark strictly against its answers."
      },
      {
        "label": "Log every miss",
        "kind": "write",
        "minutes": 10,
        "instruction": "Transfer every wrong or incomplete answer from the sheet and the question-bank attempt into the MAT700 error log, with the correct version alongside it.",
        "checklistText": "Copy every wrong or incomplete answer from today's sheet and test into the MAT700 error log."
      }
    ]
  },
  'mat700-rebuild-l2': {
    "concepts": [
      "The three-part mathematical framework for learning: sampled data, a loss functional over a hypothesis space, minimising expected loss",
      "Instance-based vs model-based learning — an axis independent of supervised/unsupervised"
    ],
    "steps": [
      {
        "label": "Skim: Lecture 2 notes + slides",
        "kind": "read",
        "minutes": 25,
        "instruction": "Skim the slides/notes once, then read both linked notes closely for the exact three-part framework wording and the instance-based/model-based contrast.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-2-notes",
          "mat700-lecture-slides-lecture-2-slides"
        ],
        "noteIds": [
          "m7-learning-framework",
          "m7-instance-vs-model"
        ],
        "checklistText": "Read both linked notes closely for the exact three-part learning framework and the instance-vs-model-based contrast."
      },
      {
        "label": "Write: L2 one-page sheet from memory",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book: write the three framework components, the regression vs classification loss table, and the instance-based vs model-based distinction with one example of each (kNN; Naive Bayes/k-means).",
        "noteIds": [
          "m7-learning-framework",
          "m7-instance-vs-model"
        ],
        "checklistText": "From memory, sketch the regression-vs-classification loss table and give one instance-based and one model-based example."
      },
      {
        "label": "Test: Lecture 2 question bank, closed book",
        "kind": "test",
        "minutes": 25,
        "instruction": "Answer every prompt before checking. Mark strictly against the question bank's own answers.",
        "resourceIds": [
          "mat700-question-banks-lecture-2-question-bank"
        ],
        "checklistText": "Answer every prompt in the Lecture 2 question bank before checking, then mark strictly against its answers."
      },
      {
        "label": "Log every miss",
        "kind": "write",
        "minutes": 10,
        "instruction": "Add every wrong or incomplete answer to the MAT700 error log with the correct version.",
        "checklistText": "Add every wrong or incomplete answer from today's sheet and test to the MAT700 error log."
      }
    ]
  },
  'mat700-rebuild-l3': {
    "concepts": [
      "k-shingling: representing a document as a set of length-k substrings, and how to choose k",
      "Minhashing: characteristic matrix, minhash signatures, and why signature agreement estimates Jaccard similarity"
    ],
    "steps": [
      {
        "label": "Skim: Lecture 3 notes + slides",
        "kind": "read",
        "minutes": 25,
        "instruction": "Skim the slides/notes once, then read both linked notes closely for the shingle-set definition, the choosing-k rule, and the minhash-of-a-column definition.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-3-notes",
          "mat700-lecture-slides-lecture-3-slides"
        ],
        "noteIds": [
          "m7-shingling",
          "m7-minhash"
        ],
        "checklistText": "Read both notes closely for the k-shingle definition, the choosing-k rule, and the minhash-of-a-column definition."
      },
      {
        "label": "Write: L3 one-page sheet from memory",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book: define a k-shingle and work the 2-shingles of one short string; define minhash of a column and describe how a signature matrix is built from n permutations.",
        "noteIds": [
          "m7-shingling",
          "m7-minhash"
        ],
        "checklistText": "From memory, work the 2-shingles of a short string and describe how n permutations build a signature matrix."
      },
      {
        "label": "Test: Lecture 3 question bank, closed book",
        "kind": "test",
        "minutes": 25,
        "instruction": "Answer every prompt before checking. Mark strictly against the question bank's own answers.",
        "resourceIds": [
          "mat700-question-banks-lecture-3-question-bank"
        ],
        "checklistText": "Answer every prompt in the Lecture 3 question bank before checking, then mark strictly against its answers."
      },
      {
        "label": "Log every miss",
        "kind": "write",
        "minutes": 10,
        "instruction": "Add every wrong or incomplete answer to the MAT700 error log with the correct version.",
        "checklistText": "Add every wrong or incomplete answer from today's sheet and test to the MAT700 error log."
      }
    ]
  },
  'mat700-rebuild-l4': {
    "concepts": [
      "Basic and weighted kNN classification, and how k is chosen",
      "Generalization error vs training error, and why 1-NN's zero training error is not good news"
    ],
    "steps": [
      {
        "label": "Skim: Lecture 4 notes + slides",
        "kind": "read",
        "minutes": 25,
        "instruction": "Skim the slides/notes once, then read both linked notes closely for the two-step kNN definition, the distance-weight formula, and the generalization-error definition.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-4-notes",
          "mat700-lecture-slides-lecture-4-slides"
        ],
        "noteIds": [
          "m7-knn-definition",
          "m7-generalization-error"
        ],
        "checklistText": "Read both notes closely for the two-step kNN definition, the distance-weight formula, and generalization error."
      },
      {
        "label": "Write: L4 one-page sheet from memory",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book: write basic kNN's two steps, the weighted-vote formula, why weighting reduces sensitivity to k, the generalization-error definition, and the 60/20/20 split.",
        "noteIds": [
          "m7-knn-definition",
          "m7-generalization-error"
        ],
        "checklistText": "From memory, write the weighted-vote formula and explain why weighting reduces kNN's sensitivity to k."
      },
      {
        "label": "Test: Lecture 4 question bank, closed book",
        "kind": "test",
        "minutes": 25,
        "instruction": "Answer every prompt before checking. Mark strictly against the question bank's own answers.",
        "resourceIds": [
          "mat700-question-banks-lecture-4-question-bank"
        ],
        "checklistText": "Answer every prompt in the Lecture 4 question bank before checking, then mark strictly against its answers."
      },
      {
        "label": "Log every miss",
        "kind": "write",
        "minutes": 10,
        "instruction": "Add every wrong or incomplete answer to the MAT700 error log with the correct version.",
        "checklistText": "Add every wrong or incomplete answer from today's sheet and test to the MAT700 error log."
      }
    ]
  },
  'mat700-rebuild-l5': {
    "concepts": [
      "PageRank: the transition matrix M, with column = source page and row = destination page",
      "Idealized PageRank as the principal eigenvector (eigenvalue 1); needs a strongly connected graph to converge",
      "Dead ends and spider traps, and their fixes: replace zero columns with e/n; add taxation/teleportation",
      "The taxed PageRank formula v' = (1-beta)e/n + beta*M*v, and running one hand iteration"
    ],
    "steps": [
      {
        "label": "Read: L5 notes + PageRank definition, convergence, dead ends/traps",
        "kind": "read",
        "minutes": 25,
        "instruction": "Skim the lecture-5 notes once for overall shape, then work the three linked notes properly: what M means and which index is source vs destination, why idealized PageRank converges (and when it doesn't), and the dead-end/spider-trap fixes.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-5-notes"
        ],
        "noteIds": [
          "m7-pagerank-idea",
          "m7-pagerank-idealized",
          "m7-pagerank-deadends-traps"
        ],
        "checklistText": "Work through why idealized PageRank converges, then study the dead-end and spider-trap fixes carefully."
      },
      {
        "label": "Write: taxed PageRank formula + one hand iteration",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book: write the full formula v' = (1-beta)e/n + beta*M*v, state beta=0.85 (Google) vs the lecture's worked beta=0.8 case, then hand-run one iteration of PageRank on a small 3-4 node graph you make up, from memory.",
        "noteIds": [
          "m7-pagerank-formula"
        ],
        "checklistText": "From memory, hand-run one PageRank iteration on a 3-4 node graph you sketch yourself."
      },
      {
        "label": "Test: L5 question bank",
        "kind": "test",
        "minutes": 25,
        "instruction": "Answer every linked question-bank prompt closed-book before checking the answers on the page. Mark right/wrong honestly.",
        "resourceIds": [
          "mat700-question-banks-lecture-5-question-bank"
        ],
        "checklistText": "Answer every Lecture 5 question bank prompt closed-book, then mark yourself honestly against the answers."
      },
      {
        "label": "Log: MAT700 error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Add every wrong sign, misread index, or dropped fix (dead end vs spider trap) from steps 2-3 into the MAT700 error log — that sheet is what you re-read before the exam, not the whole lecture.",
        "checklistText": "Log every sign error, misread index, or dead-end/spider-trap mix-up from today's practice into the error log."
      }
    ]
  },
  'mat700-rebuild-l6': {
    "concepts": [
      "Two clustering strategies: hierarchical/agglomerative (start separate, merge) vs point assignment (assign to best-fitting cluster)",
      "Euclidean vs non-Euclidean clustering: a centroid only exists in Euclidean space",
      "Hierarchical clustering's three decisions: representation, merge rule, stopping rule",
      "Centroid vs clustroid, and the three common clustroid choices (min sum, min max, min sum-of-squares distance)"
    ],
    "steps": [
      {
        "label": "Read: L6 notes + clustering strategies and hierarchical clustering",
        "kind": "read",
        "minutes": 25,
        "instruction": "Skim the lecture-6 notes once, then read both linked notes properly: the two strategies and their starting points, then the hierarchical merge loop and the centroid-vs-clustroid distinction.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-6-notes"
        ],
        "noteIds": [
          "m7-clustering-strategies",
          "m7-hierarchical"
        ],
        "checklistText": "Read both notes for the hierarchical merge loop and the centroid-versus-clustroid distinction."
      },
      {
        "label": "Write: strategies + hierarchical algorithm from memory",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book: name both clustering strategies with one line each, write the three decisions that define a hierarchical algorithm, and state centroid vs clustroid with one example distance choice for each.",
        "checklistText": "From memory, list the three decisions that define a hierarchical algorithm and contrast centroid versus clustroid."
      },
      {
        "label": "Test: L6 question bank",
        "kind": "test",
        "minutes": 25,
        "instruction": "Answer every linked question-bank prompt closed-book before checking the answers on the page.",
        "resourceIds": [
          "mat700-question-banks-lecture-6-question-bank"
        ],
        "checklistText": "Answer every Lecture 6 question bank prompt closed-book before checking the answers on the page."
      },
      {
        "label": "Log: MAT700 error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Record every mixed-up term (especially centroid vs clustroid, or the wrong merge criterion) from steps 2-3 into the MAT700 error log.",
        "checklistText": "Record any centroid-versus-clustroid mix-up or wrong merge criterion from today's practice into the error log."
      }
    ]
  },
  'mat700-rebuild-l7': {
    "concepts": [
      "Meta-algorithms (algorithms operating on algorithms) and the 5-stage online learning round",
      "The halving algorithm: the consistent-set update C_{t+1}, and majority-vote prediction",
      "The weighted majority algorithm: initial weight 1, and the (1-eta) update on a wrong prediction",
      "Why halving needs a consistent expert and weighted majority does not"
    ],
    "steps": [
      {
        "label": "Read: L7 notes + meta-algorithms, halving, weighted majority",
        "kind": "read",
        "minutes": 30,
        "instruction": "Skim the lecture-7 notes once, then read all three linked notes: the meta-algorithm definition and the 5-stage online-learning round, then the halving algorithm's consistent-set update, then the weighted-majority weight update — note why L7 needs the second algorithm at all.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-7-notes"
        ],
        "noteIds": [
          "m7-meta-algorithm",
          "m7-halving-algorithm",
          "m7-weighted-majority"
        ],
        "checklistText": "Read all three notes and note why the course needs weighted majority once halving falls short."
      },
      {
        "label": "Write: both algorithms' update rules side by side",
        "kind": "write",
        "minutes": 30,
        "instruction": "Closed-book: write the halving algorithm's C_{t+1} update and majority-vote prediction, then the weighted-majority initialization (w_i=1) and (1-eta) update, side by side. One line each on why halving requires a consistent expert and weighted majority doesn't.",
        "checklistText": "From memory, write halving's C_(t+1) update beside weighted majority's (1-eta) update and explain the key difference."
      },
      {
        "label": "Test: L7 question bank",
        "kind": "test",
        "minutes": 20,
        "instruction": "Answer every linked question-bank prompt closed-book before checking the answers on the page.",
        "resourceIds": [
          "mat700-question-banks-lecture-7-question-bank"
        ],
        "checklistText": "Answer every Lecture 7 question bank prompt closed-book before checking the answers on the page."
      },
      {
        "label": "Log: MAT700 error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Record every dropped condition (e.g. forgetting the consistent-expert assumption) from steps 2-3 into the MAT700 error log.",
        "checklistText": "Record any dropped condition, like forgetting the consistent-expert assumption, from today's practice into the error log."
      }
    ]
  },
  'mat700-tutorial-1': {
    "concepts": [
      "Tutorial 1's core questions solved correctly, closed-book",
      "Every line of working checked against the worked solution, not just the final answer",
      "At least one previously-wrong question redone correctly from a blank page",
      "2-3 recall prompts capturing the question types, plus one error-log entry"
    ],
    "steps": [
      {
        "label": "Do: attempt Tutorial 1 core questions closed-book",
        "kind": "do",
        "minutes": 35,
        "instruction": "Work the core questions from the Tutorial 1 sheet with the solutions closed. If stuck past ~4 minutes on one part, mark it and move on rather than forcing it.",
        "resourceIds": [
          "mat700-tutorials-tutorial-1-beamer"
        ],
        "checklistText": "Work the Tutorial 1 core questions closed-book, marking and skipping any part that stalls past four minutes."
      },
      {
        "label": "Check: mark against Tutorial 1 solutions",
        "kind": "test",
        "minutes": 15,
        "instruction": "Check every line of your working against the worked solutions, not just the final numbers. Circle exactly where each mistake happened.",
        "resourceIds": [
          "mat700-tutorials-tutorial-1-solutions"
        ],
        "checklistText": "Check every line of your working against the Tutorial 1 solutions and circle exactly where each mistake happened."
      },
      {
        "label": "Redo: incorrect questions from a blank page",
        "kind": "do",
        "minutes": 15,
        "instruction": "Immediately redo any question you got wrong, from a fresh blank page, without looking at your first attempt.",
        "checklistText": "Redo every question you got wrong on a fresh blank page without glancing at your first attempt."
      },
      {
        "label": "Write: recall prompts + error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Write 2-3 recall prompts covering the question types you just practiced, and add one entry to the MAT700 error log for the mistake that cost the most time.",
        "checklistText": "Write 2-3 recall prompts for today's question types and log the mistake that cost you the most time."
      }
    ]
  },
  'mat700-tutorial-2': {
    "concepts": [
      "Tutorial 2's core questions solved correctly, closed-book",
      "Every line of working checked against the worked solution, not just the final answer",
      "At least one previously-wrong question redone correctly from a blank page",
      "2-3 recall prompts capturing the question types, plus one error-log entry"
    ],
    "steps": [
      {
        "label": "Do: attempt Tutorial 2 core questions closed-book",
        "kind": "do",
        "minutes": 35,
        "instruction": "Work the core questions from the Tutorial 2 sheet with the solutions closed. If stuck past ~4 minutes on one part, mark it and move on rather than forcing it.",
        "resourceIds": [
          "mat700-tutorials-tutorial-2-beamer"
        ],
        "checklistText": "Work every core question on the Tutorial 2 sheet closed-book, flagging any part that stalls past four minutes."
      },
      {
        "label": "Check: mark against Tutorial 2 solutions",
        "kind": "test",
        "minutes": 15,
        "instruction": "Check every line of your working against the worked solutions, not just the final numbers. Circle exactly where each mistake happened.",
        "resourceIds": [
          "mat700-tutorials-tutorial-2-solutions"
        ],
        "checklistText": "Mark your working line-by-line against the Tutorial 2 solutions and circle exactly where each error crept in."
      },
      {
        "label": "Redo: incorrect questions from a blank page",
        "kind": "do",
        "minutes": 15,
        "instruction": "Immediately redo any question you got wrong, from a fresh blank page, without looking at your first attempt.",
        "checklistText": "Redo every question you missed on a fresh blank page without glancing back at your first attempt."
      },
      {
        "label": "Write: recall prompts + error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Write 2-3 recall prompts covering the question types you just practiced, and add one entry to the MAT700 error log for the mistake that cost the most time.",
        "checklistText": "Draft two or three recall prompts from today's questions and log the costliest mistake in the MAT700 error log."
      }
    ]
  },
  'mat700-tutorial-3': {
    "concepts": [
      "Tutorial 3's core questions solved correctly, closed-book",
      "Every line of working checked against the worked solution, not just the final answer",
      "At least one previously-wrong question redone correctly from a blank page",
      "2-3 recall prompts capturing the question types, plus one error-log entry"
    ],
    "steps": [
      {
        "label": "Do: attempt Tutorial 3 core questions closed-book",
        "kind": "do",
        "minutes": 35,
        "instruction": "Work the core questions from the Tutorial 3 sheet with the solutions closed. If stuck past ~4 minutes on one part, mark it and move on rather than forcing it.",
        "resourceIds": [
          "mat700-tutorials-tutorial-3-beamer"
        ],
        "checklistText": "Work every core question on the Tutorial 3 sheet closed-book, flagging any part that stalls past four minutes."
      },
      {
        "label": "Check: mark against Tutorial 3 solutions",
        "kind": "test",
        "minutes": 15,
        "instruction": "Check every line of your working against the worked solutions, not just the final numbers. Circle exactly where each mistake happened.",
        "resourceIds": [
          "mat700-tutorials-tutorial-3-solutions"
        ],
        "checklistText": "Mark your working line-by-line against the Tutorial 3 solutions and circle exactly where each error crept in."
      },
      {
        "label": "Redo: incorrect questions from a blank page",
        "kind": "do",
        "minutes": 15,
        "instruction": "Immediately redo any question you got wrong, from a fresh blank page, without looking at your first attempt.",
        "checklistText": "Redo every question you missed on a fresh blank page without glancing back at your first attempt."
      },
      {
        "label": "Write: recall prompts + error log",
        "kind": "write",
        "minutes": 10,
        "instruction": "Write 2-3 recall prompts covering the question types you just practiced, and add one entry to the MAT700 error log for the mistake that cost the most time.",
        "checklistText": "Draft two or three recall prompts from today's questions and log the costliest mistake in the MAT700 error log."
      }
    ]
  },
  'mat700-tutorial-4': {
    "concepts": [
      "Tutorial 1's core question types and solution steps, recalled closed-book after a delay",
      "The specific errors from the first Tutorial 1 attempt, now targeted for correction under no-solution conditions"
    ],
    "steps": [
      {
        "label": "Do: Tutorial 1 closed-book attempt",
        "kind": "do",
        "minutes": 35,
        "instruction": "Work through the Tutorial 1 beamer questions from a blank page. No solutions open — if a method won't come back, write '?' and move on rather than guessing forever. Timebox to ~30-35 min even if some questions are left unfinished.",
        "resourceIds": [
          "mat700-tutorials-tutorial-1-beamer"
        ],
        "checklistText": "Work the Tutorial 1 beamer questions from a blank page, writing '?' instead of guessing when a method won't return."
      },
      {
        "label": "Read: check against worked solution",
        "kind": "read",
        "minutes": 20,
        "instruction": "Go line-by-line against the Tutorial 1 solutions. Mark every step that's wrong, not only the final answers — that's where the real error pattern shows up.",
        "resourceIds": [
          "mat700-tutorials-tutorial-1-solutions"
        ],
        "checklistText": "Go line-by-line through the Tutorial 1 solutions and mark every wrong step, not just wrong final answers."
      },
      {
        "label": "Write: blank-page redo of every wrong question",
        "kind": "write",
        "minutes": 15,
        "instruction": "Close the solutions again. Redo every question you got wrong, from a fresh blank page, using only what you just corrected — no peeking.",
        "checklistText": "Close the solutions and redo every wrong question again from a blank page, using only what you just corrected."
      },
      {
        "label": "Self-test: recall prompts + error log",
        "kind": "test",
        "minutes": 5,
        "instruction": "Write 2-3 short recall-prompt questions covering what tripped you up, and add one entry to the MAT700 error log naming the specific mistake pattern (not just 'got it wrong').",
        "checklistText": "Write short recall prompts on what tripped you up and log the specific mistake pattern, not just 'got it wrong.'"
      }
    ]
  },
  'mat700-tutorial-5': {
    "concepts": [
      "Tutorial 2's core question types and solution steps, recalled closed-book after a delay",
      "The specific errors from the first Tutorial 2 attempt, now targeted for correction under no-solution conditions"
    ],
    "steps": [
      {
        "label": "Do: Tutorial 2 closed-book attempt",
        "kind": "do",
        "minutes": 35,
        "instruction": "Work through the Tutorial 2 beamer questions from a blank page. No solutions open — if a method won't come back, write '?' and move on rather than guessing forever. Timebox to ~30-35 min even if some questions are left unfinished.",
        "resourceIds": [
          "mat700-tutorials-tutorial-2-beamer"
        ],
        "checklistText": "Work the Tutorial 2 beamer questions from a blank page, writing '?' instead of guessing when a method won't return."
      },
      {
        "label": "Read: check against worked solution",
        "kind": "read",
        "minutes": 20,
        "instruction": "Go line-by-line against the Tutorial 2 solutions. Mark every step that's wrong, not only the final answers — that's where the real error pattern shows up.",
        "resourceIds": [
          "mat700-tutorials-tutorial-2-solutions"
        ],
        "checklistText": "Go line-by-line through the Tutorial 2 solutions and mark every wrong step, not just wrong final answers."
      },
      {
        "label": "Write: blank-page redo of every wrong question",
        "kind": "write",
        "minutes": 15,
        "instruction": "Close the solutions again. Redo every question you got wrong, from a fresh blank page, using only what you just corrected — no peeking.",
        "checklistText": "Close the solutions and redo every wrong question again from a blank page, using only what you just corrected."
      },
      {
        "label": "Self-test: recall prompts + error log",
        "kind": "test",
        "minutes": 5,
        "instruction": "Write 2-3 short recall-prompt questions covering what tripped you up, and add one entry to the MAT700 error log naming the specific mistake pattern (not just 'got it wrong').",
        "checklistText": "Write short recall prompts on what tripped you up and log the specific mistake pattern, not just 'got it wrong.'"
      }
    ]
  },
  'mat700-tutorial-6': {
    "concepts": [
      "Tutorial 3's core question types and solution steps, recalled closed-book after a delay",
      "The specific errors from the first Tutorial 3 attempt, now targeted for correction under no-solution conditions"
    ],
    "steps": [
      {
        "label": "Do: Tutorial 3 closed-book attempt",
        "kind": "do",
        "minutes": 35,
        "instruction": "Work through the Tutorial 3 beamer questions from a blank page. No solutions open — if a method won't come back, write '?' and move on rather than guessing forever. Timebox to ~30-35 min even if some questions are left unfinished.",
        "resourceIds": [
          "mat700-tutorials-tutorial-3-beamer"
        ],
        "checklistText": "Work the Tutorial 3 beamer questions from a blank page, writing '?' instead of guessing when a method won't return."
      },
      {
        "label": "Read: check against worked solution",
        "kind": "read",
        "minutes": 20,
        "instruction": "Go line-by-line against the Tutorial 3 solutions. Mark every step that's wrong, not only the final answers — that's where the real error pattern shows up.",
        "resourceIds": [
          "mat700-tutorials-tutorial-3-solutions"
        ],
        "checklistText": "Go line-by-line through the Tutorial 3 solutions and mark every wrong step, not just wrong final answers."
      },
      {
        "label": "Write: blank-page redo of every wrong question",
        "kind": "write",
        "minutes": 15,
        "instruction": "Close the solutions again. Redo every question you got wrong, from a fresh blank page, using only what you just corrected — no peeking.",
        "checklistText": "Close the solutions and redo every wrong question again from a blank page, using only what you just corrected."
      },
      {
        "label": "Self-test: recall prompts + error log",
        "kind": "test",
        "minutes": 5,
        "instruction": "Write 2-3 short recall-prompt questions covering what tripped you up, and add one entry to the MAT700 error log naming the specific mistake pattern (not just 'got it wrong').",
        "checklistText": "Write short recall prompts on what tripped you up and log the specific mistake pattern, not just 'got it wrong.'"
      }
    ]
  },
  'mat700-tutorial-7': {
    "concepts": [
      "Recognising which of the three tutorials' methods a mixed question needs, fast and under time pressure",
      "The single most persistent error pattern across Tutorials 1-3, isolated and drilled once more"
    ],
    "steps": [
      {
        "label": "Do: timed mixed-question sprint (T1-T3)",
        "kind": "do",
        "minutes": 12,
        "instruction": "Pick one question from each of Tutorial 1, 2 and 3 — mix the topics, don't just redo favourites. Closed-book, one continuous ~10-12 min clock for all three; move on the moment time is up even if unfinished.",
        "resourceIds": [
          "mat700-tutorials-tutorial-1-beamer",
          "mat700-tutorials-tutorial-2-beamer",
          "mat700-tutorials-tutorial-3-beamer"
        ],
        "checklistText": "Pick one mixed-topic question from each of Tutorials 1-3 and clock ten to twelve minutes straight through, closed-book."
      },
      {
        "label": "Read: rapid check against all three solutions",
        "kind": "read",
        "minutes": 10,
        "instruction": "Mark each of the three answers right/wrong against the solutions. Don't re-derive anything yet — just identify which one broke down and where.",
        "resourceIds": [
          "mat700-tutorials-tutorial-1-solutions",
          "mat700-tutorials-tutorial-2-solutions",
          "mat700-tutorials-tutorial-3-solutions"
        ],
        "checklistText": "Mark all three answers right or wrong against the solutions and pinpoint exactly where the weakest one broke down."
      },
      {
        "label": "Write: redo the worst one + one-line error log",
        "kind": "write",
        "minutes": 8,
        "instruction": "From a blank page, redo only the question that broke down. Then add one error-log line naming the pattern that keeps recurring across Tutorials 1-3.",
        "checklistText": "Redo only the question that broke down from a blank page, then log the recurring pattern across Tutorials 1-3."
      }
    ]
  },
  'mat700-template-a': {
    "concepts": [
      "TF-IDF: TF_ij, IDF_i = log2(N/n_i), and the combined weight formula",
      "Constructing a term-document vector from raw counts before weighting",
      "Jaccard similarity for sets vs. for bags (multisets)"
    ],
    "steps": [
      {
        "label": "Write: TF-IDF and Jaccard formulas from memory",
        "kind": "write",
        "minutes": 20,
        "instruction": "Closed-book. Write TF_ij, IDF_i = log2(N/n_i), the combined TF-IDF weight, and Jaccard similarity for sets and for bags. Don't check yet — get everything you have onto the page first.",
        "noteIds": [
          "m7-tfidf-definition",
          "m7-jaccard-sets",
          "m7-jaccard-bags"
        ],
        "checklistText": "Write TF-IDF, IDF, and both set and bag Jaccard similarity formulas from memory before checking anything."
      },
      {
        "label": "Read: check against the cheat sheet and worked numeric example",
        "kind": "read",
        "minutes": 20,
        "instruction": "Compare your recall against the master cheat sheet and the numeric worked example. Circle every formula you got wrong or fudged and rewrite it correctly once.",
        "resourceIds": [
          "mat700-formula-sheets-master-formula-cheat-sheet"
        ],
        "noteIds": [
          "m7-tfidf-bound",
          "m7-tfidf-numeric"
        ],
        "checklistText": "Compare your recalled formulas against the master cheat sheet and the worked numeric example, rewriting any you fudged."
      },
      {
        "label": "Do: two timed questions (TF-IDF + Jaccard)",
        "kind": "do",
        "minutes": 100,
        "instruction": "Set a timer at ~40 min each. Pick one TF-IDF question from the Lecture 2 bank and one Jaccard (sets or bags) question from the Lecture 3 bank. Full working, closed notes.",
        "resourceIds": [
          "mat700-question-banks-lecture-2-question-bank",
          "mat700-question-banks-lecture-3-question-bank"
        ],
        "checklistText": "Solve one Lecture 2 TF-IDF question and one Lecture 3 Jaccard question, forty minutes each, closed notes, full working."
      },
      {
        "label": "Test: mark strictly against the bank's solutions",
        "kind": "test",
        "minutes": 40,
        "instruction": "Mark line-by-line against the answer prompts. Award marks only for steps actually shown, not steps you 'would have' written.",
        "resourceIds": [
          "mat700-question-banks-lecture-2-question-bank",
          "mat700-question-banks-lecture-3-question-bank"
        ],
        "checklistText": "Mark both answers strictly line-by-line against the bank's solutions, crediting only steps you actually wrote down."
      },
      {
        "label": "Write: repair the weaker answer + update error log",
        "kind": "write",
        "minutes": 45,
        "instruction": "Rewrite the lower-scoring of the two answers from scratch, closed-book, until it's clean. Log the exact mistake and its fix in your running error log.",
        "checklistText": "Rewrite your lower-scoring answer from scratch until it's clean, then log the exact mistake and its fix."
      }
    ]
  },
  'mat700-template-b': {
    "concepts": [
      "Graph theory basics: adjacency matrices and the degree-sum proof (sum of deg(v) = 2|E|)",
      "The four distance axioms, applied to prove edit distance and Jaccard distance are metrics",
      "Minhash collision probability = Jaccard similarity, and the bag-Jaccard ≤ 1/2 bound",
      "kNN worked numerically on a 1-D dataset"
    ],
    "steps": [
      {
        "label": "Write: graphs, distance axioms, and proofs from memory",
        "kind": "write",
        "minutes": 45,
        "instruction": "Closed-book. Write: graph/adjacency definitions plus the degree-sum proof; the four distance axioms; the edit-distance and Jaccard-distance metric proofs; the bag-Jaccard ≤ 1/2 bound; and the minhash-collision-probability proof. This is the heaviest recall block — go slowly and completely before checking anything.",
        "noteIds": [
          "m7-graph-basics",
          "m7-adjacency-matrix",
          "m7-degree-sum-proof",
          "m7-distance-axioms",
          "m7-edit-distance-proof",
          "m7-jaccard-distance-proof",
          "m7-jaccard-bags-bound",
          "m7-minhash-theorem"
        ],
        "checklistText": "Write out the graph definitions, the four distance axioms, and all five core proofs from memory before checking anything."
      },
      {
        "label": "Read: check against the one-page proof drill + kNN worked example",
        "kind": "read",
        "minutes": 20,
        "instruction": "Line up your proofs against the one-page drill and fix any dropped step. Then read the kNN worked example once so the numeric pattern is fresh.",
        "noteIds": [
          "m7-proof-drill",
          "m7-knn-worked"
        ],
        "checklistText": "Check your proofs against the one-page drill, fixing any dropped step, then read the kNN worked example once."
      },
      {
        "label": "Do: two timed questions (graph/proof + kNN)",
        "kind": "do",
        "minutes": 90,
        "instruction": "Timer ~45 min each. One graph or distance-proof question from the Lecture 2 bank, one kNN question from the Lecture 4 bank.",
        "resourceIds": [
          "mat700-question-banks-lecture-2-question-bank",
          "mat700-question-banks-lecture-4-question-bank"
        ],
        "checklistText": "Solve one Lecture 2 graph or distance-proof question and one Lecture 4 kNN question, forty-five minutes each."
      },
      {
        "label": "Test: mark strictly against the bank's solutions",
        "kind": "test",
        "minutes": 35,
        "instruction": "Mark against the answer prompts proof step by proof step — a missing axiom name or a skipped inequality line loses the mark even if the conclusion is right.",
        "resourceIds": [
          "mat700-question-banks-lecture-2-question-bank",
          "mat700-question-banks-lecture-4-question-bank"
        ],
        "checklistText": "Mark each proof step-by-step against the solutions; a missing axiom name loses the mark even with the right answer."
      },
      {
        "label": "Write: repair the weakest proof + update error log",
        "kind": "write",
        "minutes": 35,
        "instruction": "Identify whichever single proof felt shakiest under time and rewrite it twice, cold. Add it to the error log.",
        "checklistText": "Rewrite your shakiest proof twice from scratch, cold, and add it to your running error log."
      }
    ]
  },
  'mat700-template-c': {
    "concepts": [
      "Naive Bayes with pseudo-count correction, applied to a worked classification example",
      "PageRank: the iteration formula and hand-computation over a small graph",
      "k-means: the algorithm and the proof that it converges"
    ],
    "steps": [
      {
        "label": "Write: Naive Bayes, PageRank, and k-means from memory",
        "kind": "write",
        "minutes": 40,
        "instruction": "Closed-book. Write: Bayes' theorem plus the Naive Bayes method with pseudo-count correction; the PageRank iteration v' = (1-beta)e/n + beta*M*v and the out-link proof; the k-means algorithm and its convergence argument.",
        "noteIds": [
          "m7-bayes-theorem",
          "m7-naive-bayes-method",
          "m7-pagerank-worked",
          "m7-pagerank-outlinks-proof",
          "m7-kmeans-algorithm",
          "m7-kmeans-convergence"
        ],
        "checklistText": "Write out Bayes' theorem with pseudo-count correction, the PageRank update v'=(1-beta)e/n+beta*Mv, and k-means convergence, closed-book."
      },
      {
        "label": "Read: check against the Naive Bayes worked example",
        "kind": "read",
        "minutes": 15,
        "instruction": "Walk through the weather-data worked example once and confirm your pseudo-count handling matches it exactly.",
        "noteIds": [
          "m7-naive-bayes-worked"
        ],
        "checklistText": "Walk through the weather-data Naive Bayes example and verify your pseudo-count handling matches it exactly."
      },
      {
        "label": "Do: two timed questions (classifier/PageRank + clustering)",
        "kind": "do",
        "minutes": 100,
        "instruction": "Timer ~50 min each. Pick one Naive Bayes or PageRank question (Lecture 4 or 5 bank) and one k-means/clustering question (Lecture 6 bank).",
        "resourceIds": [
          "mat700-question-banks-lecture-4-question-bank",
          "mat700-question-banks-lecture-5-question-bank",
          "mat700-question-banks-lecture-6-question-bank"
        ],
        "checklistText": "Time yourself 50 minutes each on a Lecture 4/5 Naive Bayes or PageRank question plus a Lecture 6 clustering question."
      },
      {
        "label": "Test: mark strictly against the bank's solutions",
        "kind": "test",
        "minutes": 35,
        "instruction": "Mark each iteration/assignment step separately — partial-credit steps in PageRank and k-means are where marks are usually lost.",
        "resourceIds": [
          "mat700-question-banks-lecture-4-question-bank",
          "mat700-question-banks-lecture-5-question-bank",
          "mat700-question-banks-lecture-6-question-bank"
        ],
        "checklistText": "Mark each PageRank iteration and k-means assignment step separately - that's where partial credit usually slips away."
      },
      {
        "label": "Write: repair the weakest template + update error log",
        "kind": "write",
        "minutes": 35,
        "instruction": "Redo the algorithm you fumbled, from a blank page, until the steps run in the right order without hesitation. Log the miss.",
        "checklistText": "Rebuild the algorithm you fumbled from a blank page until it runs smoothly in order, then log the miss."
      }
    ]
  },
  'mat700-template-d': {
    "concepts": [
      "Softmax and cross-entropy definitions",
      "Precision, recall, F-measure, and the F ≤ (p+r)/2 proof",
      "Halving and weighted-majority mistake bounds (the boosting/meta-algorithm family)"
    ],
    "steps": [
      {
        "label": "Write: softmax, cross-entropy, precision/recall, and mistake bounds from memory",
        "kind": "write",
        "minutes": 45,
        "instruction": "Closed-book. Write the softmax and cross-entropy formulas; precision/recall/F-measure plus the F ≤ (p+r)/2 proof; and the halving and weighted-majority mistake bounds.",
        "noteIds": [
          "m7-softmax",
          "m7-cross-entropy",
          "m7-precision-recall",
          "m7-f-measure-proof",
          "m7-halving-proof",
          "m7-weighted-majority-bound"
        ],
        "checklistText": "Write the softmax and cross-entropy formulas, the F<=(p+r)/2 proof, and both mistake-bound derivations, closed-book."
      },
      {
        "label": "Read: boosting/meta-algorithm refresher",
        "kind": "read",
        "minutes": 10,
        "instruction": "Skim the Lecture 7 notes for how boosting extends the halving/weighted-majority idea — there's no separate flashcard for this part, so this is the one source to lean on.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-7-notes"
        ],
        "checklistText": "Skim the Lecture 7 notes on how boosting extends the halving and weighted-majority ideas - your only source here."
      },
      {
        "label": "Do: two timed questions (softmax/metrics + experts)",
        "kind": "do",
        "minutes": 95,
        "instruction": "Timer ~45-50 min each. One softmax/cross-entropy or precision-recall question (Lecture 2 or 4 bank), one halving/weighted-majority/boosting question (Lecture 7 bank).",
        "resourceIds": [
          "mat700-question-banks-lecture-2-question-bank",
          "mat700-question-banks-lecture-4-question-bank",
          "mat700-question-banks-lecture-7-question-bank"
        ],
        "checklistText": "Time 45-50 minutes each on a Lecture 2/4 softmax or precision-recall question and a Lecture 7 boosting question."
      },
      {
        "label": "Test: mark strictly against the bank's solutions",
        "kind": "test",
        "minutes": 35,
        "instruction": "Mark the proofs on structure, not just the final bound — each inequality step is worth marks on its own.",
        "resourceIds": [
          "mat700-question-banks-lecture-2-question-bank",
          "mat700-question-banks-lecture-4-question-bank",
          "mat700-question-banks-lecture-7-question-bank"
        ],
        "checklistText": "Mark each proof step by step, not just the final bound - every inequality line earns its own marks."
      },
      {
        "label": "Write: repair the weakest template + update error log",
        "kind": "write",
        "minutes": 40,
        "instruction": "Rebuild the weakest proof or metric derivation from scratch, cold, and log exactly which line you dropped.",
        "checklistText": "Rebuild your weakest proof or metric derivation from scratch, cold, and note exactly which line you dropped."
      }
    ]
  },
  'mat700-paper-a': {
    "concepts": [
      "The recurring MAT700 exam core across the 2023/2024 papers: TF-IDF, Bonferroni, PageRank, halving/weighted majority, kNN, Naive Bayes, k-means",
      "Strict, topic-tagged marking that converts one timed score into a ranked, actionable repair list"
    ],
    "steps": [
      {
        "label": "Read: exam shape + recurring-topic map",
        "kind": "read",
        "minutes": 10,
        "instruction": "Skim the 2023-vs-2024 topic table once, cold. Use it to decide which topics your mixed set must cover so nothing recurring gets skipped.",
        "noteIds": [
          "m7-exam-shape"
        ],
        "checklistText": "Skim the 2023-vs-2024 topic table once, cold, to pick which recurring topics your mixed set must cover."
      },
      {
        "label": "Do: assemble the mixed timed set",
        "kind": "do",
        "minutes": 15,
        "instruction": "Take the 2023 paper as the backbone and answer all 4 questions (not just 3) for full coverage. Pull 2-3 extra questions from each tutorial, plus the lecture 3 (similarity) question bank — 2023 doesn't test Jaccard/similarity, so this fills that real gap. Pack it into one closed-book set.",
        "resourceIds": [
          "mat700-past-papers-2023-past-paper",
          "mat700-tutorials-tutorial-1-beamer",
          "mat700-tutorials-tutorial-2-beamer",
          "mat700-tutorials-tutorial-3-beamer",
          "mat700-question-banks-lecture-3-question-bank"
        ],
        "checklistText": "Build a closed-book set from all four 2023 questions, tutorial extras, and Lecture 3 similarity questions to cover the Jaccard gap."
      },
      {
        "label": "Test: two-hour timed closed-book attempt",
        "kind": "test",
        "minutes": 120,
        "instruction": "No notes, no formula sheet, phone away. Stop at 120 minutes even if unfinished — an honest score matters more than a complete one.",
        "checklistText": "Sit the set for a strict two hours, no notes or phone, and stop cold even if unfinished."
      },
      {
        "label": "Write: mark strictly + score by topic",
        "kind": "write",
        "minutes": 35,
        "instruction": "Mark every question against the real solutions and the master cheat sheet, no benefit of the doubt. Tally correct/incorrect per topic (TF-IDF, similarity, PageRank, clustering, boosting, evaluation).",
        "resourceIds": [
          "mat700-tutorials-tutorial-1-solutions",
          "mat700-tutorials-tutorial-2-solutions",
          "mat700-tutorials-tutorial-3-solutions",
          "mat700-formula-sheets-master-formula-cheat-sheet"
        ],
        "checklistText": "Mark every answer against the real solutions and cheat sheet, then tally right/wrong per topic across all six areas."
      },
      {
        "label": "Write: rank the top three repair needs",
        "kind": "write",
        "minutes": 15,
        "instruction": "From the topic tally, rank the three worst-scoring topics. Write them as the opening line of the repair-a error log — that's the only input that card needs.",
        "checklistText": "Rank your three worst-scoring topics from the tally and write them as the opening line of the repair-a log."
      }
    ]
  },
  'mat700-repair-a': {
    "concepts": [
      "Targeted repair: redo only the failed templates from set A, from one matching source, not a full reread",
      "Blank-page repetition as the actual test of whether a repair closed the gap"
    ],
    "steps": [
      {
        "label": "Write: redo every failed question from set A",
        "kind": "write",
        "minutes": 40,
        "instruction": "Work strictly from the paper-a error list, worst topic first. Redo each failed question fully with working — no peeking at solutions yet.",
        "checklistText": "Redo every failed question from set A in full working, worst topic first, without peeking at solutions yet."
      },
      {
        "label": "Read: one targeted source for your worst topic",
        "kind": "read",
        "minutes": 35,
        "instruction": "Open only the ONE lecture-notes file or tutorial-solutions file that matches your top-ranked repair topic. Read it once, for the specific gap only — do not browse the others.",
        "resourceIds": [
          "mat700-lecture-notes-lecture-1-notes",
          "mat700-lecture-notes-lecture-2-notes",
          "mat700-lecture-notes-lecture-3-notes",
          "mat700-lecture-notes-lecture-4-notes",
          "mat700-lecture-notes-lecture-5-notes",
          "mat700-lecture-notes-lecture-6-notes",
          "mat700-lecture-notes-lecture-7-notes",
          "mat700-tutorials-tutorial-1-solutions",
          "mat700-tutorials-tutorial-2-solutions",
          "mat700-tutorials-tutorial-3-solutions"
        ],
        "checklistText": "Open only the single lecture-notes or tutorial-solutions file matching your top repair topic - skip everything else."
      },
      {
        "label": "Do: repeat from blank page",
        "kind": "do",
        "minutes": 30,
        "instruction": "Close the source. Re-solve the same failed questions completely from memory (~5 min each). Compare against your own redo only at the end.",
        "checklistText": "Close the source and re-solve the same failed questions from memory, about five minutes each, then compare."
      },
      {
        "label": "Write: update the formula sheet",
        "kind": "write",
        "minutes": 15,
        "instruction": "Add or correct any formula/procedure that caused a failure directly onto the two-hour exam cheat sheet. This feeds the final A4 sheet later, so word it the way you'll want it under time pressure.",
        "resourceIds": [
          "mat700-formula-sheets-two-hour-exam-cheat-sheet"
        ],
        "checklistText": "Add or fix the formula that caused each failure directly on the two-hour cheat sheet, worded for exam-day speed."
      }
    ]
  },
  'mat700-paper-b': {
    "concepts": [
      "A second full timed simulation (2024 paper + fresh tutorial questions) testing whether set A's fixes actually held",
      "Side-by-side topic comparison to separate one-off slips from genuinely repeated errors"
    ],
    "steps": [
      {
        "label": "Do: assemble the second mixed timed set",
        "kind": "do",
        "minutes": 15,
        "instruction": "2024 paper as backbone, answer all 4. Swap in different tutorial questions than set A used, and add the lecture 6 (clustering) question bank as a second-pass check, so this is a genuinely new set, not a repeat.",
        "resourceIds": [
          "mat700-past-papers-2024-past-paper",
          "mat700-tutorials-tutorial-1-beamer",
          "mat700-tutorials-tutorial-2-beamer",
          "mat700-tutorials-tutorial-3-beamer",
          "mat700-question-banks-lecture-6-question-bank"
        ],
        "checklistText": "Build a fresh closed-book set from all four 2024 questions, new tutorial picks, plus Lecture 6 clustering as a second check."
      },
      {
        "label": "Test: two-hour timed closed-book attempt",
        "kind": "test",
        "minutes": 120,
        "instruction": "Same rules as set A: no notes, no formula sheet, stop at 120 minutes.",
        "checklistText": "Sit this set for a strict two hours with the same no-notes, no-formula-sheet rules as set A."
      },
      {
        "label": "Write: mark strictly + score by topic",
        "kind": "write",
        "minutes": 30,
        "instruction": "Mark against the real solutions and your now-updated cheat sheet. Tally correct/incorrect per topic exactly as you did for set A.",
        "resourceIds": [
          "mat700-tutorials-tutorial-1-solutions",
          "mat700-tutorials-tutorial-2-solutions",
          "mat700-tutorials-tutorial-3-solutions",
          "mat700-formula-sheets-two-hour-exam-cheat-sheet"
        ],
        "checklistText": "Mark against the real solutions and your updated cheat sheet, tallying right/wrong per topic just like set A."
      },
      {
        "label": "Write: compare with set A + flag repeats",
        "kind": "write",
        "minutes": 30,
        "instruction": "Put the two topic tallies side by side. Any topic that failed in both sets is a repeated error — name it explicitly; that name is the only input repair-b needs.",
        "checklistText": "Line up both topic tallies side by side and name any topic that failed in both sets explicitly."
      }
    ]
  },
  'mat700-repair-b': {
    "concepts": [
      "Closing only confirmed repeat errors — deliberately not reopening the whole syllabus this late",
      "Formula recall checked against your own compiled sheet, not new source material"
    ],
    "steps": [
      {
        "label": "Write: fix the repeated errors only",
        "kind": "write",
        "minutes": 40,
        "instruction": "Take only the topics flagged as repeated across both mixed sets. Redo those specific questions fully with working, checking your cheat sheet only if stuck.",
        "resourceIds": [
          "mat700-formula-sheets-two-hour-exam-cheat-sheet"
        ],
        "checklistText": "Redo only the questions from topics that failed in both mixed sets, working fully, checking the sheet only if stuck."
      },
      {
        "label": "Do: one blank-page question per weak template",
        "kind": "do",
        "minutes": 40,
        "instruction": "For every weak template from either mixed set (not just the exact repeats), solve one fresh question from blank memory, reusing a question you've already seen in tutorials or question banks. Do not open any new source.",
        "checklistText": "For each weak template from either set, solve one fresh blank-page question pulled from tutorials or question banks you've seen."
      },
      {
        "label": "Test: formula recall against your own sheet",
        "kind": "test",
        "minutes": 25,
        "instruction": "Cover the cheat sheet. Write every formula on it from memory, then check. Circle only what's still wrong — that's the last thing to fix, nothing else.",
        "resourceIds": [
          "mat700-formula-sheets-two-hour-exam-cheat-sheet"
        ],
        "checklistText": "Cover the cheat sheet, write every formula from memory, then circle only what's still wrong on it."
      },
      {
        "label": "Write: close the error log",
        "kind": "write",
        "minutes": 15,
        "instruction": "Confirm every high-value error from both mixed sets now has a closed line in the error log. If anything remains open, decide explicitly to accept the risk rather than silently drop it — do not add new topics.",
        "checklistText": "Confirm every high-value error from both sets is closed in the log, or explicitly accept the risk if not."
      }
    ]
  },
  'mat700-final-recall': {
    "concepts": [
      "Full closed-book recall of the seven calculations and eight proofs that carry most of the exam's marks",
      "The two-sided A4 sheet: what's worth writing down versus what must already be memorized",
      "Final logistics: only the still-open error-log lines, plus what's allowed in the room"
    ],
    "steps": [
      {
        "label": "Write: core formulas from memory",
        "kind": "write",
        "minutes": 25,
        "instruction": "Blank page, no notes: write every formula from the seven-calculation drill and the A4-sheet plan (TF-IDF, PageRank, k-means objective, precision/recall/F, Naive Bayes, birthday-triples, weighted-majority/halving bounds). Check against the notes only after you finish.",
        "noteIds": [
          "m7-calculation-drill",
          "m7-cheat-sheet-plan"
        ],
        "checklistText": "Write out all seven core formulas - TF-IDF through weighted-majority bounds - from a blank page before checking notes."
      },
      {
        "label": "Recite: procedure + proof triggers",
        "kind": "test",
        "minutes": 20,
        "instruction": "Out loud or on paper, recite the trigger/skeleton for each of the eight proofs cold. Flag any proof you can't start within 15 seconds.",
        "noteIds": [
          "m7-proof-drill"
        ],
        "checklistText": "Recite the opening trigger for each of the eight proofs cold, flagging any you can't start within fifteen seconds."
      },
      {
        "label": "Review: unresolved error-log lines only",
        "kind": "read",
        "minutes": 20,
        "instruction": "Open the error log built across repair-a and repair-b. Read only the lines still marked open — skip everything already closed.",
        "checklistText": "Reread only the still-open lines in your repair-a and repair-b error log, skipping anything already closed."
      },
      {
        "label": "Do: prepare exam materials",
        "kind": "do",
        "minutes": 25,
        "instruction": "Write the final one-sheet, two-sided A4 using the cheat-sheet plan. Pack your calculator and squared graph paper, and re-check what the exam-shape note says is actually allowed in the room.",
        "noteIds": [
          "m7-exam-shape"
        ],
        "checklistText": "Write your final two-sided A4 sheet, pack your calculator and graph paper, and confirm what's allowed in the exam room."
      }
    ]
  },
}
function totalMinutes(steps) {
  return (steps ?? []).reduce((sum, step) => sum + (Number(step.minutes) || 0), 0)
}

/**
 * Attach the curated study sequence (and its rolled-up resource/note ids) to
 * every card that has one. `studySequence` carries the ordered steps and the
 * card's must-cover concepts; referenced resourceIds are also folded into
 * card.resourceIds so "Resources for this card" always includes them,
 * regardless of what the broader heuristic in cardResources.js would have
 * picked on its own.
 *
 * card.checklist is REPLACED (not merged) with one item per step, in step
 * order, so the tickable checklist and the "How to study this card" sequence
 * can never disagree again — ticking checklist item N is completing step N —
 * while still reading as its own natural checklist line rather than a copy
 * of the step's header: each step carries a `checklistText` (a distinct,
 * standalone one-liner) separate from `label` (the short sequence header)
 * and `instruction` (the full explanation). This is safe to replace wholesale
 * because checklist "done" state is tracked by position
 * (`${cardId}-check-${index}`, see useTrackerState.js), so replacing the text
 * at each position preserves whatever was already ticked there; it does not
 * resync retroactively if a card's step COUNT ever changes later.
 */
export function applyCardStudySequences(cards) {
  return cards.map((card) => {
    const plan = CARD_STUDY_SEQUENCE[card.id]
    if (!plan) return card

    const stepResourceIds = plan.steps.flatMap((step) => step.resourceIds ?? [])
    const resourceIds = [...new Set([...stepResourceIds, ...(card.resourceIds ?? [])])]
    const checklist = plan.steps.map((step) => step.checklistText ?? step.label)

    return {
      ...card,
      resourceIds,
      checklist,
      studySequence: {
        concepts: plan.concepts ?? [],
        steps: plan.steps,
        totalMinutes: totalMinutes(plan.steps),
      },
    }
  })
}
