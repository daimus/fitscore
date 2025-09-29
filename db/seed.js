const { config } = require("dotenv");
import { Pool } from "pg";
import { drizzle } from 'drizzle-orm/node-postgres';
const { jobTable, rubricTable } = require("./schema");
const { embed } = require("../src/services/genkit/tool/embed");

config({ path: '.env' });

async function seed(arg) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URI,
    });
    const db = drizzle({ client: pool }, { logger: true });

    if (!arg) {
        console.log("Usage db:seed <arg>")
        return;
    }

    console.log('Seeding %s', arg);
    switch (arg) {
        case 'all':
            seedJob(db);
            seedRubric(db);
            break;
        case 'job':
            seedJob(db);
            break;
        case 'rubric':
            seedRubric(db);
            break;
    }
}

async function seedJob(db) {
    const title = `Product Engineer (Backend) 2025`;
    const initalJobData = {
        title: title,
        description: `About the Job
You'll be building new product features alongside a frontend engineer and product manager using our Agile methodology,
as well as addressing issues to ensure our apps are robust and our codebase is clean. As a Product Engineer, you'll write
clean, efficient code to enhance our product's codebase in meaningful ways.
In addition to classic backend work, this role also touches on building AI-powered systems, where you’ll design and
orchestrate how large language models (LLMs) integrate into Rakamin’s product ecosystem.

Here are some real examples of the work in our team:
- Collaborating with frontend engineers and 3rd parties to build robust backend solutions that support highly
configurable platforms and cross-platform integration.
- Developing and maintaining server-side logic for central database, ensuring high performance throughput and response
time.
- Designing and fine-tuning AI prompts that align with product requirements and user contexts.
- Building LLM chaining flows, where the output from one model is reliably passed to and enriched by another.
- Implementing Retrieval-Augmented Generation (RAG) by embedding and retrieving context from vector databases,
then injecting it into AI prompts to improve accuracy and relevance.
- Handling long-running AI processes gracefully — including job orchestration, async background workers, and retry
mechanisms.
- Designing safeguards for uncontrolled scenarios: managing failure cases from 3rd party APIs and mitigating the
randomness/nondeterminism of LLM outputs.
- Leveraging AI tools and workflows to increase team productivity (e.g., AI-assisted code generation, automated QA,
internal bots).
- Writing reusable, testable, and efficient code to improve the functionality of our existing systems.
Strengthening our test coverage with RSpec to build robust and reliable web apps.
- Conducting full product lifecycles, from idea generation to design, implementation, testing, deployment, and
maintenance.
- Providing input on technical feasibility, timelines, and potential product trade-offs, working with business divisions.
- Actively engaging with users and stakeholders to understand their needs and translate them into backend and AI-
driven improvements.

About You
We’re looking for candidates with a strong track record of working on backend technologies of web apps, ideally with
exposure to AI/LLM development or a strong desire to learn.
You should have experience with backend languages and frameworks (Node.js, Django, Rails), as well as modern backend
tooling and technologies such as:
- Database management (MySQL, PostgreSQL, MongoDB)
- RESTful APIs
- Security compliance
- Cloud technologies (AWS, Google Cloud, Azure)
- Server-side languages (Java, Python, Ruby, or JavaScript)
- Understanding of frontend technologies
- User authentication and authorization between multiple systems, servers, and environments
- Scalable application design principles
- Creating database schemas that represent and support business processes
- Implementing automated testing platforms and unit tests
- Familiarity with LLM APIs, embeddings, vector databases and prompt design best practices
We're not big on credentials, so a Computer Science degree or graduating from a prestigious university isn't something we
emphasize. We care about what you can do and how you do it, not how you got here.
While you'll report to a CTO directly, Rakamin is a company where Managers of One
thrive. We're quick to trust that you
can do it, and here to support you. You can expect to be counted on and do your best work and build a career here.
This is a remote job. You're free to work where you work best: home office, co-working space, coffee shops. To ensure time
zone overlap with our current team and maintain well communication, we're only looking for people based in Indonesia.`,
        embedding: null,
    }
    const embeddings = await embed(initalJobData.description);
    initalJobData.embedding = embeddings[0].embedding
    await db.insert(jobTable).values(initalJobData);
}

async function seedRubric(db) {
    const initialRubrics = [
        {
            type: "cv",
            parameter: "Technical Skills Match",
            description: "Alignment with job requirements (backend, databases, APIs, cloud, AI/LLM)."
        },
        {
            type: "cv",
            parameter: "Experience Level",
            description: "Years of experience and project complexity. "
        },
        {
            type: "cv",
            parameter: "Relevant Achievements",
            description: "Impact of past work (scaling, performance, adoption)."
        },
        {
            type: "cv",
            parameter: "Cultural / Collaboration Fit",
            description: "Communication, learning mindset, teamwork/leadership."
        },
        {
            type: "project",
            parameter: "Correctness (Prompt & Chaining)",
            description: "Implements prompt design, LLM chaining, RAG context injection."
        },
        {
            type: "project",
            parameter: "Code Quality & Structure",
            description: "Clean, modular, reusable, tested. "
        },
        {
            type: "project",
            parameter: "Resilience & Error Handling",
            description: "Handles long jobs, retries, randomness, API failures."
        },
        {
            type: "project",
            parameter: "Documentation & Explanation",
            description: "README clarity, setup instructions, trade-off explanations."
        },
        {
            type: "project",
            parameter: "Creativity / Bonus",
            description: "Extra features beyond requirements."
        },
    ];
    await Promise.all(initialRubrics.map(async rubric => {
        const embedding = await embed(rubric.description);
        rubric.embedding = embedding[0].embedding;
    }));


    await db.insert(rubricTable).values(initialRubrics);
}

async function main() {
    try {
        const arg = process.argv[2];
        seed(arg);
        console.log('Seeding completed');
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}
main();