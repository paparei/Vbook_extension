load('config.js');

function execute() {
    return Response.success([
        { title: 'Sách nói mới', input: AUDIO_ROOT, script: 'gen.js' },
        { title: 'Radio mới', input: RADIO_ROOT, script: 'gen.js' },
        { title: 'Radio Truyện Dài Kỳ', input: RADIO_ROOT + 'radio-truyen-dai-ky/', script: 'gen.js' },
        { title: 'Radio Truyện Ngắn', input: RADIO_ROOT + 'radio-truyen-ngan/', script: 'gen.js' },
        { title: 'Kịch Truyền Thanh', input: RADIO_ROOT + 'kich-truyen-thanh/', script: 'gen.js' },
        { title: 'Tóm Tắt Sách', input: RADIO_ROOT + 'tom-tat-sach/', script: 'gen.js' }
    ]);
}
