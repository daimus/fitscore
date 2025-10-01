const { config } = require("dotenv");
import { Pool } from "pg";
import { drizzle } from 'drizzle-orm/node-postgres';
const { jobTable, rubricTable, jobEmbeddingTable } = require("./schema");
const { embed } = require("../src/services/genkit/tool/embed");
const { chunk } = require("../src/services/genkit/tool/chunk");

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
    const initalJobData = [{
        title: title,
        intro: `You'll be building new product features alongside a frontend engineer and product manager using our Agile methodology,
as well as addressing issues to ensure our apps are robust and our codebase is clean. As a Product Engineer, you'll write
clean, efficient code to enhance our product's codebase in meaningful ways.
In addition to classic backend work, this role also touches on building AI-powered systems, where you will design and
orchestrate how large language models (LLMs) integrate into Rakamin's product ecosystem.`,
        work: `Here are some real examples of the work in our team:
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
driven improvements.`,
        skills: `We're looking for candidates with a strong track record of working on backend technologies of web apps, ideally with
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
- Familiarity with LLM APIs, embeddings, vector databases and prompt design best practices`,
        qualification: ``,
        culture: `We're not big on credentials, so a Computer Science degree or graduating from a prestigious university isn't something we emphasize. We care about what you can do and how you do it, not how you got here.
While you'll report to a CTO directly, Rakamin is a company where Managers of One
thrive. We're quick to trust that you can do it, and here to support you. You can expect to be counted on and do your best work and build a career here.
This is a remote job. You're free to work where you work best: home office, co-working space, coffee shops. To ensure time
zone overlap with our current team and maintain well communication, we're only looking for people based in Indonesia.`,
        other: ``,
    }, {
        title: `Marketing Specialist`,
        intro: `You'll be driving creative and data-driven marketing initiatives alongside a design team, sales representatives, and product managers, using our Agile methodology. As a Marketing Specialist, you'll craft and execute strategies that elevate our brand presence, generate leads, and strengthen customer engagement across multiple channels. You'll analyze results, optimize campaigns, and ensure that our messaging resonates effectively with our target audiences.`,
        work: `Here are some real examples of the work in our team:
        - Planning and executing multi-channel marketing campaigns (digital ads, email, social media, SEO/SEM).
        - Conducting market research to identify new opportunities and customer needs.
        - Creating content for web, social, email, and offline media that drives user acquisition and brand awareness.
        - Managing and optimizing paid advertising campaigns to achieve strong ROI.
        - Collaborating with designers and copywriters to produce high-quality visuals and messaging.
        - Implementing marketing automation workflows to nurture leads and improve conversion rates.
        - Managing brand partnerships, events, and sponsorship initiatives.
        - Tracking KPIs and campaign performance, providing actionable insights to stakeholders.
        - Working closely with product and sales teams to align marketing strategies with business goals.
        - Ensuring brand consistency across all customer touchpoints and communication channels.`,
        skills: `We're looking for candidates with a proven track record in digital marketing and creative campaign management. You should have experience in marketing execution, performance optimization, and communication strategy. Key skills include:
        - Proficiency in digital marketing platforms (Google Ads, Facebook Ads, LinkedIn Ads).
        - Experience with SEO, SEM, and content marketing.
        - Strong analytical skills using tools like Google Analytics, social media insights, and data dashboards.
        - Familiarity with CRM and marketing automation tools (HubSpot, Mailchimp, or similar).
        - Excellent written and verbal communication skills in English and Bahasa Indonesia.
        - Ability to craft compelling content tailored to different audiences.
        - Understanding of brand strategy and positioning.
        - Knowledge of social media trends and engagement tactics.
        - Creative mindset with the ability to think outside the box.
        - Strong organizational skills to manage multiple campaigns simultaneously.`,
        qualification: `1-3 years of professional marketing experience (digital marketing preferred).
        Bachelor's degree in Marketing, Communications, or related field is a plus but not required.
        Portfolio of past campaigns or measurable results is highly valued.`,
        culture: `We're not big on credentials, so having a degree from a prestigious university isn't something we emphasize. What matters most is the impact you can create and how you collaborate with the team. At our company, we thrive on trust and ownership, giving you space to take initiative and grow. You'll work closely with a supportive, cross-functional team that encourages creativity and experimentation. This role is remote-friendly within Indonesia, so you can work from home, co-working spaces, or anywhere that helps you do your best work while staying connected with the team.",
        other: "Full-time position with opportunities for growth into senior marketing or leadership roles. Competitive compensation with performance-based incentives.`
    }
    ];

    for (const ijd of initalJobData) {
        const [job] = await db.insert(jobTable).values(ijd).returning({ id: jobTable.id });
        const chunks = [];
        let chunkIndex = 0;
        if (ijd.title) {
            const chunked = await chunk(ijd.title);
            for (const c of chunked) {
                const embedding = await embed(c);
                chunks.push({
                    jobId: job.id,
                    section: 'title',
                    chunkIndex: chunkIndex++,
                    content: c,
                    embedding: embedding[0].embedding
                })
            }
        }
        if (ijd.intro) {
            const chunked = await chunk(ijd.intro);
            for (const c of chunked) {
                const embedding = await embed(c);
                chunks.push({
                    jobId: job.id,
                    section: 'intro',
                    chunkIndex: chunkIndex++,
                    content: c,
                    embedding: embedding[0].embedding
                })
            }
        }
        if (ijd.work) {
            const chunked = await chunk(ijd.work);
            for (const c of chunked) {
                const embedding = await embed(c);
                chunks.push({
                    jobId: job.id,
                    section: 'work',
                    chunkIndex: chunkIndex++,
                    content: c,
                    embedding: embedding[0].embedding
                })
            }
        }
        if (ijd.skills) {
            const chunked = await chunk(ijd.skills);
            for (const c of chunked) {
                const embedding = await embed(c);
                chunks.push({
                    jobId: job.id,
                    section: 'skills',
                    chunkIndex: chunkIndex++,
                    content: c,
                    embedding: embedding[0].embedding
                })
            }
        }
        if (ijd.qualification) {
            const chunked = await chunk(ijd.qualification);
            for (const c of chunked) {
                const embedding = await embed(c);
                chunks.push({
                    jobId: job.id,
                    section: 'qualification',
                    chunkIndex: chunkIndex++,
                    content: c,
                    embedding: embedding[0].embedding
                })
            }
        }
        if (ijd.culture) {
            const chunked = await chunk(ijd.culture);
            for (const c of chunked) {
                const embedding = await embed(c);
                chunks.push({
                    jobId: job.id,
                    section: 'culture',
                    chunkIndex: chunkIndex++,
                    content: c,
                    embedding: embedding[0].embedding
                })
            }
        }
        if (ijd.other) {
            const chunked = await chunk(ijd.other);
            for (const c of chunked) {
                const embedding = await embed(c);
                chunks.push({
                    jobId: job.id,
                    section: 'other',
                    chunkIndex: chunkIndex++,
                    content: c,
                    embedding: embedding[0].embedding
                })
            }
        }
        await db.insert(jobEmbeddingTable).values(chunks);
    }
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