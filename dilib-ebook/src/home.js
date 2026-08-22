function execute() {
    Log.log('dilib-ebook home: open ebook list');
    return Response.success([
        { title: 'Sách điện tử', input: '', script: 'search.js' }
    ]);
}
