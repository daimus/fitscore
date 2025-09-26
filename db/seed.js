const { config } = require("dotenv");

config({ path: '.env' });

async function seed() {
    // TODO: initiate data seeding here
}
async function main() {
    try {
        seed();
        console.log('Seeding completed');
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}
main();