export type ProjectStatus = 'Deployed' | 'In Progress' | 'Archived';

export interface ProjectRecord {
  id: string;
  title: string;
  category: string | null;
  year: number | null;
  project_date: string | null;
  description: string | null;
  tech_stack: string[] | null;
  live_url: string | null;
  status: ProjectStatus | null;
  order_index: number | null;
  visible: boolean | null;
  slug?: string | null;
  github_url?: string | null;
  live_cta_label?: string | null;
  case_study?: string | null;
}

interface ProjectPreset {
  slug: string;
  githubUrl: string;
  liveCtaLabel: string;
  kicker: string;
  caseStudy: string;
}

export const PROJECT_SELECT_BASE =
  'id,title,category,year,project_date,description,tech_stack,live_url,status,order_index,visible';

export const PROJECT_SELECT_EXTENDED =
  `${PROJECT_SELECT_BASE},slug,github_url,live_cta_label,case_study`;

const PROJECT_PRESETS: Record<string, ProjectPreset> = {
  'nutricore ai': {
    slug: 'nutricore-ai',
    githubUrl: 'https://github.com/LordCrateis/nutricore-ai',
    liveCtaLabel: 'Generate a Nutrition Plan',
    kicker: 'Applied machine learning, from training data to a product people can use.',
    caseStudy: `## The context

Nutrition calculators usually stop at static formulas. NutriCore was built to treat the problem as a prediction system: translate food and lifestyle inputs into useful estimates for calories, macronutrients, hydration, and supplement priorities.

## What I built

The product connects a React interface to a Flask REST API serving gradient-boosting models trained with scikit-learn. A user submits their profile once and receives a coordinated nutrition output instead of a collection of disconnected numbers.

## How it works

1. The interface validates and packages lifestyle and nutrition inputs.
2. The API converts those inputs into the feature shape used during training.
3. Cached regressors generate calorie and macronutrient estimates.
4. Application logic turns the model output into hydration and supplement priorities.
5. The response is rendered as a readable plan in the browser.

## Engineering decisions

The model layer and product rules remain separate. That keeps predictions reproducible while allowing recommendation logic to evolve without retraining every estimator. The API is deployed independently from the frontend, making the system easier to debug and release.

## Problems solved

The work included correcting data leakage in the training path, repairing supplement-priority logic, and taking the complete system through cloud deployment, API integration, and custom-domain routing.

## Outcome

NutriCore demonstrates the complete ML delivery loop: train, validate, serve, integrate, deploy, observe, and repair.`,
  },
  'titanic prediction game': {
    slug: 'titanic-prediction-game',
    githubUrl: 'https://github.com/LordCrateis/titanic-prediction-game',
    liveCtaLabel: 'Board the Simulation',
    kicker: 'Interactive fiction whose final scene is a live model inference.',
    caseStudy: `## The context

The Titanic dataset is often reduced to a notebook and an accuracy score. This project asks a more interesting question: can a familiar classifier become an experience that makes feature-driven prediction understandable?

## What I built

The result is a choice-driven narrative. Each decision contributes to a passenger profile, and the completed profile is sent to a live inference API for a survival prediction.

## How it works

1. The story collects choices without presenting them as a conventional data-entry form.
2. Those choices are mapped onto the model's passenger features.
3. The frontend submits the assembled record to a FastAPI service.
4. The trained survival model returns its prediction.
5. The ending explains the result in the context of the journey the player just took.

## Engineering decisions

The narrative layer never changes the feature contract. Story state is translated through one explicit mapping before inference, keeping the model API independent from the interface and making the boundary testable.

## Problems solved

The central design challenge was balancing dramatic choices with valid model inputs. The system also required cross-origin API handling and a deployment split that keeps the static game fast while the Python model runs separately.

## Outcome

The project turns an introductory classification problem into a model people can interrogate through play rather than documentation.`,
  },
  'olist ecommerce analytics': {
    slug: 'olist-ecommerce-analytics',
    githubUrl: 'https://github.com/LordCrateis/olist-ecommerce-analytics',
    liveCtaLabel: 'Explore the Dashboard',
    kicker: 'A commerce dataset turned into an operational decision surface.',
    caseStudy: `## The context

Olist's Brazilian marketplace data spans customers, orders, products, payments, reviews, sellers, and delivery events. Useful analysis depends on making those tables agree before a dashboard ever appears.

## What I built

This is an end-to-end analytics project: relational cleaning and modeling in PostgreSQL, exploratory analysis in Python, and an interactive Power BI dashboard designed around commercial and operational questions.

## How it works

1. Raw marketplace tables are profiled and cleaned.
2. SQL joins establish consistent order, customer, product, and delivery views.
3. Python analysis checks distributions, anomalies, and relationships.
4. Business measures are shaped for Power BI.
5. The dashboard exposes revenue, category, customer, and delivery patterns through coordinated views.

## Engineering decisions

Data preparation is kept upstream of the dashboard. Power BI receives analysis-ready measures rather than becoming the place where every data-quality rule is hidden. That makes findings easier to reproduce and audit.

## Questions answered

The analysis focuses on what drives revenue, how delivery performance affects customers, which categories and regions matter most, and where operational behaviour deserves deeper investigation.

## Outcome

The final system connects data modeling, analysis, visualization, and business interpretation instead of treating them as separate portfolio exercises.`,
  },
  'flamolina chatbot': {
    slug: 'flamolina-chatbot',
    githubUrl: 'https://github.com/LordCrateis/flamolina-chatbot',
    liveCtaLabel: 'Ask Flamolina',
    kicker: 'A portfolio-aware RAG assistant with a deliberately narrow mind.',
    caseStudy: `## The context

A portfolio can contain the facts and still make visitors hunt for the answer they need. Flamolina provides a conversational route through the same work while staying grounded in Shivam's projects, writing, and profile data.

## What I built

Flamolina is a retrieval-augmented assistant with a FastAPI backend, Supabase Postgres and pgvector storage, sentence-transformer embeddings, and hosted language-model inference. The chat interface lives inside this portfolio; retrieval and generation remain in a separate service.

## How it works

1. Portfolio material is chunked and embedded.
2. The user message is converted into a query embedding.
3. pgvector retrieves the most relevant project and writing context.
4. The backend assembles a constrained prompt with conversation history.
5. The model answers inside Flamolina's intentionally opinionated voice.

## Engineering decisions

The assistant is domain-limited by design. Retrieval supplies evidence, the API owns behavioural boundaries, and the frontend only manages conversation state and rendering. This separation keeps private credentials and model orchestration out of the browser.

## Constraints solved

The backend was designed around a tight deployment memory ceiling. Model selection, embedding size, dependencies, and retrieval behaviour were chosen to keep the service useful without pretending infrastructure is unlimited.

## Outcome

Flamolina turns the portfolio into something visitors can question while preserving a clear boundary between verified portfolio context and unsupported conversation.`,
  },
  'flight control tower': {
    slug: 'flight-control-tower',
    githubUrl: 'https://github.com/LordCrateis/flight-delay-control-tower',
    liveCtaLabel: 'Run a Delay Forecast',
    kicker: 'Operational flight data translated into an immediate risk forecast.',
    caseStudy: `## The context

Flight delays are not a single yes-or-no outcome. Travellers and operators need to understand whether a schedule looks on time, mildly disrupted, or severely delayed—and how confident the system is.

## What I built

Flight Control Tower is an interactive delay-risk simulator backed by a deployed machine-learning model. Users enter route and schedule details and receive a risk class, calibrated confidence, and a probability breakdown.

## How it works

1. Route and schedule inputs are validated in the React interface.
2. The client maps them to the inference contract used by the hosted model.
3. The model evaluates the flight against patterns learned from a large U.S. flight dataset.
4. The API returns probabilities for on-time, minor-delay, and severe-delay outcomes.
5. The interface translates those probabilities into an operational reading rather than exposing a bare class label.

## Engineering decisions

Probability is treated as part of the product, not debug output. The interface preserves the model's uncertainty and keeps the API adapter isolated so the frontend can survive hosting and contract changes.

## Problems solved

The project spans feature engineering, multiclass prediction, calibration, hosted inference, CORS, static-site deployment, and the practical failure modes that appear when a live model and browser application ship separately.

## Outcome

The finished simulator makes a large analytical pipeline legible through one focused interaction: describe a flight and inspect its delay risk.`,
  },
  nagarik: {
    slug: 'nagarik',
    githubUrl: 'https://github.com/LordCrateis/nagarik',
    liveCtaLabel: 'Find Eligible Schemes',
    kicker: 'Government schemes made searchable, comparable, and actionable.',
    caseStudy: `## The context

Citizens often miss government benefits because scheme information is fragmented, eligibility language is difficult to compare, and application requirements are discovered too late.

## What I built

Nagarik is an AI-powered benefits navigator that matches a citizen profile with relevant schemes, recommends compatible benefit bundles, and turns the result into an application-preparation path.

## How it works

1. Guided intake collects the facts needed for eligibility matching.
2. Retrieval gathers relevant scheme information from the knowledge base and current sources.
3. The recommendation layer ranks schemes against the citizen profile.
4. Compatibility logic groups benefits that can be pursued together.
5. The interface presents evidence, requirements, and next actions in one place.

## Engineering decisions

Retrieval and recommendation are separated. Firecrawl supports source discovery, the RAG layer grounds responses, and model providers can be used behind a stable application contract. Supabase supplies authentication and relational state for the product experience.

## Safeguards

The system is designed to guide discovery and preparation, not impersonate a government authority. Source visibility, uncertainty, and clear application requirements matter more than producing a confident answer at any cost.

## Outcome

Nagarik reduces the distance between “a scheme exists” and “I know whether it fits me and what to do next.”`,
  },
};

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function slugifyProject(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getProjectPreset(title: string): ProjectPreset | null {
  return PROJECT_PRESETS[normalizeTitle(title)] ?? null;
}

export function getProjectSlug(project: Pick<ProjectRecord, 'title' | 'slug'>): string {
  return project.slug?.trim() || getProjectPreset(project.title)?.slug || slugifyProject(project.title);
}

export function resolveProjectPresentation(project: ProjectRecord) {
  const preset = getProjectPreset(project.title);
  const fallbackCaseStudy = `## The context\n\n${project.description || 'This project is being documented.'}\n\n## What I built\n\nA focused system built with ${(project.tech_stack ?? []).join(', ') || 'a deliberately selected technical stack'}.\n\n## Current state\n\nThe project page will continue to grow as new decisions, results, and media are documented.`;

  return {
    slug: getProjectSlug(project),
    githubUrl: project.github_url?.trim() || preset?.githubUrl || '',
    liveCtaLabel: project.live_cta_label?.trim() || preset?.liveCtaLabel || 'Open the Project',
    kicker: preset?.kicker || project.description || 'A closer look at the system, its decisions, and its outcome.',
    caseStudy: project.case_study?.trim() || preset?.caseStudy || fallbackCaseStudy,
  };
}

export function formatProjectDate(dateStr: string | null, year: number | null): string {
  if (dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day}, ${month}, ${date.getFullYear()}`;
  }

  return year ? String(year) : 'Date ongoing';
}
