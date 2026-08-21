load('config.js');

function execute() {
    return Response.success([
        { title: 'Mới cập nhật', input: 'latest', script: 'gen.js' },
        { title: 'Được theo dõi nhiều', input: 'follows', script: 'gen.js' },
        { title: 'Đánh giá cao', input: 'rating', script: 'gen.js' },
        { title: 'Truyện hoàn thành', input: 'completed', script: 'gen.js' }
    ]);
}
