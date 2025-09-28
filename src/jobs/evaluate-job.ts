import { Container } from "typedi";
import Bull from "bull";
import Logger from "@/loaders/logger";
import config from "@/config";

const JOB_NAME = "evaluate-job";
export default function () {
    const job = new Bull(JOB_NAME, {
        redis: {
            host: config.redis.host,
            port: config.redis.port,
            username: config.redis.username,
            password: config.redis.password,
            db: config.redis.db
        }
    });

    Container.set("EvaluateJob", job);
    Logger.info("✅ JOB %s Loaded!", JOB_NAME)
    job.process(handler);
    job.on('error', function (error) {
        // An error occured.
        Logger.error("JOB %s error : %s", JOB_NAME, error.message)
    })

    job.on('waiting', function (jobId) {
        // A Job is waiting to be processed as soon as a worker is idling.
        Logger.info("JOB %s : %s > waiting", JOB_NAME, jobId);
    });

    job.on('active', function (job, jobPromise) {
        // A job has started. You can use `jobPromise.cancel()`` to abort it.
        Logger.info("JOB %s : %s > active", JOB_NAME, job.id);
    })

    job.on('stalled', function (job) {
        // A job has been marked as stalled. This is useful for debugging job
        // workers that crash or pause the event loop.
        Logger.info("JOB %s : %s > stalled", JOB_NAME, job.id);
    })

    job.on('lock-extension-failed', function (job, err) {
        // A job failed to extend lock. This will be useful to debug redis
        // connection issues and jobs getting restarted because workers
        // are not able to extend locks.
        Logger.info("JOB %s : %s > lock-extension-failed : %j", JOB_NAME, job.id, err);
    });

    job.on('progress', function (job, progress) {
        // A job's progress was updated!
        Logger.info("JOB %s : %s > progress : %s", JOB_NAME, job.id, progress);
    })

    job.on('completed', function (job, result) {
        // A job successfully completed with a `result`.
        Logger.info("JOB %s : %s > completed : %j", JOB_NAME, job.id, result);
    })

    job.on('failed', function (job, err) {
        // A job failed with reason `err`!
        Logger.info("JOB %s : %s > failed : %j", JOB_NAME, job.id, err);
    })

    job.on('paused', function () {
        // The queue has been paused.
        Logger.info("JOB %s > paused", JOB_NAME);
    })

    job.on('resumed', function (job) {
        // The queue has been resumed.
        Logger.info("JOB %s : %s > resumed", JOB_NAME, job.id);
    })

    job.on('cleaned', function (jobs, type) {
        // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
        // jobs, and `type` is the type of jobs cleaned.
        Logger.info("JOB %s > cleaned : %j", JOB_NAME, type);
    });

    job.on('drained', function () {
        // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
        Logger.info("JOB %s > drained", JOB_NAME);
    });

    job.on('removed', function (job) {
        // A job successfully removed.
        Logger.info("JOB %s : %s > removed", JOB_NAME, job.id);
    });
    return job;
}

async function handler(job, done) {
    Logger.info("JOB %s : %s > running", JOB_NAME, job.id);
    // TODO: process job here
    done();
}