load('config.js');

function execute() {
    return Response.success([
        { title: 'Latest comics', input: BASE_URL + '/', script: 'gen.js' },
        { title: 'Currently reading', input: BASE_URL + '/watched/', script: 'gen.js' }
    ]);
}
