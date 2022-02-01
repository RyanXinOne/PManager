const exec = require('child_process').exec;

function execute(cmd) {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
        } else {
            if (stdout)
                console.log(stdout);
            if (stderr)
                console.error(stderr);
        }
    });
}

execute('npx pm -c 1 -n 0 1-4 vv1-1');
