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
        Logger.info("%s | JOB %s > waiting", jobId, JOB_NAME);
    });

    job.on('active', function (job, jobPromise) {
        // A job has started. You can use `jobPromise.cancel()`` to abort it.
        Logger.info("%s | JOB %s > running", job.id, JOB_NAME);
    })

    job.on('stalled', function (job) {
        // A job has been marked as stalled. This is useful for debugging job
        // workers that crash or pause the event loop.
        Logger.info("%s | JOB %s > stalled", job.id, JOB_NAME);
    })

    job.on('lock-extension-failed', function (job, err) {
        // A job failed to extend lock. This will be useful to debug redis
        // connection issues and jobs getting restarted because workers
        // are not able to extend locks.
        Logger.info("%s | JOB %s > lock-extension-failed : %j", job.id, JOB_NAME, err);
    });

    job.on('progress', function (job, progress) {
        // A job's progress was updated!
        Logger.info("%s | JOB %s > progress : %s", job.id, JOB_NAME, progress);
    })

    job.on('completed', function (job, result) {
        // A job successfully completed with a `result`.
        Logger.info("%s | JOB %s > completed : %j", job.id, JOB_NAME, result);
    })

    job.on('failed', function (job, err) {
        // A job failed with reason `err`!
        Logger.info("%s | JOB %s > failed : %j", job.id, JOB_NAME, err);
    })

    job.on('paused', function () {
        // The queue has been paused.
        Logger.info("%s | JOB %s > paused", '', JOB_NAME);
    })

    job.on('resumed', function (job) {
        // The queue has been resumed.
        Logger.info("%s | JOB %s > resumed", job.id, JOB_NAME);
    })

    job.on('cleaned', function (jobs, type) {
        // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
        // jobs, and `type` is the type of jobs cleaned.
        Logger.info("%s | JOB %s > cleaned : %j", '', JOB_NAME, type);
    });

    job.on('drained', function () {
        // Emitted every time the queue has processed all the waiting jobs (even if there can be some delayed jobs not yet processed)
        Logger.info("%s | JOB %s > drained", '', JOB_NAME);
    });

    job.on('removed', function (job) {
        // A job successfully removed.
        Logger.info("%s | JOB %s > removed", job.id, JOB_NAME);
    });
    return job;
}

async function handler(job, done) {
    // TODO: process job here
    done();
}