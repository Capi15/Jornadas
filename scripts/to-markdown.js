const fs = require("fs");
const utils = require("util");
const path = require("path");
const downloadRelease = require("download-github-release");
const { exec } = require("child_process");

async function fetchPandoc() {
    console.log("Fetching latest pandoc...");

    try {
        await fs.promises.mkdir(path.resolve(__dirname, "../bin/pandoc"), {
            recursive: true
        });

        await downloadRelease(
            "jgm",
            "pandoc",
            path.resolve(__dirname, "../bin/pandoc"),
            r => r.prerelease === false,
            a => a.name.endsWith("-windows-x86_64.zip")
        );
    } catch {
        if (
            await utils.promisify(fs.exists)(path.resolve(__dirname, "../bin"))
        ) {
            await fs.promises.rmdir(path.resolve(__dirname, "../bin"), {
                recursive: true
            });
        }
    }
}

async function checkPandoc() {
    console.log("Check if has pandoc...");

    return utils.promisify(fs.exists)(
        path.resolve(__dirname, "../bin/pandoc/pandoc.exe")
    );
}

/**
 *
 * @param {string} file
 */
const getFileName = file => file.slice(0, file.indexOf("."));

async function clearMarkdownFolder() {
    console.log("Clear markdown folder...");

    if (
        !(await utils.promisify(fs.exists)(
            path.resolve(__dirname, "../markdown")
        ))
    )
        return;

    const files = await fs.promises.readdir(
        path.resolve(__dirname, "../markdown")
    );
    await Promise.all(
        files.map(f =>
            fs.promises.unlink(path.resolve(__dirname, "../markdown/", f))
        )
    );
}

function promiseFromChildProcess(child) {
    return new Promise(function(resolve, reject) {
        child.addListener("error", reject);
        child.addListener("exit", resolve);
    });
}

async function convertDocToMD() {
    console.log("Converting docs to markdown...");
    const docFiles = await fs.promises.readdir(
        path.resolve(__dirname, "../docs")
    );

    if (
        !(await utils.promisify(fs.exists)(
            path.resolve(__dirname, "../markdown")
        ))
    )
        await fs.promises.mkdir(path.resolve(__dirname, "../markdown"));

    const conversions = docFiles
        .filter(docFile =>
            /^(?![\~\$]+).*\.(docx|doc)$/.test(path.basename(docFile))
        )
        .map(docFile =>
            promiseFromChildProcess(
                exec(
                    `${path.resolve(
                        __dirname,
                        "../bin/pandoc/pandoc.exe"
                    )} -f docx -t gfm ${path.resolve(
                        __dirname,
                        "../docs",
                        docFile
                    )} -o ${path.resolve(
                        __dirname,
                        "../markdown",
                        `${getFileName(path.basename(docFile))}.md`
                    )}`
                )
            )
        );

    await Promise.all(conversions);
}

async function main() {
    try {
        const exists = await checkPandoc();

        if (!exists) {
            console.log("Pandoc doesent exists...");
            await fetchPandoc();
        }

        await clearMarkdownFolder();
        await convertDocToMD();
    } catch (e) {
        console.log("Algo correu mal...");
    }
}

main();
