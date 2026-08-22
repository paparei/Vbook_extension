var EPUB_MAX_ARCHIVE = 32 * 1024 * 1024;
var EPUB_MAX_ENTRY = 16 * 1024 * 1024;
var EPUB_MAX_FILES = 10000;
var EPUB_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var EPUB_CRC_TABLE = null;
var EPUB_FIXED_TREES = null;

// ponytail: these size ceilings protect Rhino memory; raise them or move extraction native-side for unusually large text EPUBs.
function epubBase64Binary(value) {
    var data = String(value || '').replace(/^data:[^,]*;base64,/i, '').replace(/\s+/g, '');
    if (!data || data.length % 4 !== 0 || data.length > Math.ceil(EPUB_MAX_ARCHIVE / 3) * 4 + 4) throw new Error('Dữ liệu EPUB base64 không hợp lệ');

    var parts = [];
    var bytes = [];
    var size = 0;
    for (var index = 0; index < data.length; index += 4) {
        var a = EPUB_BASE64.indexOf(data.charAt(index));
        var b = EPUB_BASE64.indexOf(data.charAt(index + 1));
        var cChar = data.charAt(index + 2);
        var dChar = data.charAt(index + 3);
        var c = cChar === '=' ? -2 : EPUB_BASE64.indexOf(cChar);
        var d = dChar === '=' ? -2 : EPUB_BASE64.indexOf(dChar);
        if (a < 0 || b < 0 || c < 0 && c !== -2 || d < 0 && d !== -2 || c === -2 && d !== -2 || (c === -2 || d === -2) && index + 4 !== data.length) throw new Error('Dữ liệu EPUB base64 không hợp lệ');

        bytes.push((a << 2) | (b >> 4));
        if (c !== -2) bytes.push(((b & 15) << 4) | (c >> 2));
        if (d !== -2) bytes.push(((c & 3) << 6) | d);
        size = size + (c === -2 ? 1 : d === -2 ? 2 : 3);
        if (size > EPUB_MAX_ARCHIVE) throw new Error('EPUB quá lớn để xử lý an toàn');
        if (bytes.length >= 8192) {
            parts.push(String.fromCharCode.apply(null, bytes));
            bytes = [];
        }
    }
    if (bytes.length) parts.push(String.fromCharCode.apply(null, bytes));
    return parts.join('');
}

function epubNeed(source, offset, length, message) {
    if (offset < 0 || length < 0 || offset + length > source.length) throw new Error(message || 'EPUB bị hỏng');
}

function epubU16(source, offset) {
    epubNeed(source, offset, 2);
    return source.charCodeAt(offset) | source.charCodeAt(offset + 1) << 8;
}

function epubU32(source, offset) {
    epubNeed(source, offset, 4);
    return (source.charCodeAt(offset) | source.charCodeAt(offset + 1) << 8 | source.charCodeAt(offset + 2) << 16 | source.charCodeAt(offset + 3) << 24) >>> 0;
}

function epubByte(source, index) {
    return typeof source === 'string' ? source.charCodeAt(index) : source[index];
}

function epubChars(chars) {
    var parts = [];
    for (var index = 0; index < chars.length; index += 8192) parts.push(String.fromCharCode.apply(null, chars.slice(index, index + 8192)));
    return parts.join('');
}

function epubUtf8(source, start, end) {
    var chars = [];
    var index = start || 0;
    var limit = typeof end === 'number' ? end : source.length;
    if (limit - index >= 3 && epubByte(source, index) === 239 && epubByte(source, index + 1) === 187 && epubByte(source, index + 2) === 191) index += 3;

    while (index < limit) {
        var first = epubByte(source, index++);
        if (first < 128) {
            chars.push(first);
        } else if (first >= 194 && first <= 223 && index < limit) {
            var second = epubByte(source, index++);
            chars.push((first & 31) << 6 | second & 63);
        } else if (first >= 224 && first <= 239 && index + 1 < limit) {
            var second3 = epubByte(source, index++);
            var third = epubByte(source, index++);
            chars.push((first & 15) << 12 | (second3 & 63) << 6 | third & 63);
        } else if (first >= 240 && first <= 244 && index + 2 < limit) {
            var second4 = epubByte(source, index++);
            var third4 = epubByte(source, index++);
            var fourth = epubByte(source, index++);
            var point = (first & 7) << 18 | (second4 & 63) << 12 | (third4 & 63) << 6 | fourth & 63;
            point -= 65536;
            chars.push(55296 + (point >> 10), 56320 + (point & 1023));
        } else {
            chars.push(65533);
        }
    }
    return epubChars(chars);
}

function epubText(source) {
    if (source.length >= 2 && (epubByte(source, 0) === 255 && epubByte(source, 1) === 254 || epubByte(source, 0) === 254 && epubByte(source, 1) === 255)) {
        var little = epubByte(source, 0) === 255;
        var chars = [];
        for (var index = 2; index + 1 < source.length; index += 2) chars.push(little ? epubByte(source, index) | epubByte(source, index + 1) << 8 : epubByte(source, index) << 8 | epubByte(source, index + 1));
        return epubChars(chars);
    }
    return epubUtf8(source, 0, source.length);
}

function epubZipName(source, offset, length, utf8) {
    if (utf8) return epubUtf8(source, offset, offset + length);
    var name = '';
    for (var index = offset; index < offset + length; index++) name += String.fromCharCode(source.charCodeAt(index));
    return name;
}

function epubNormalizePath(value) {
    var path = String(value || '').replace(/\\/g, '/').replace(/[?#].*$/, '');
    try { path = decodeURIComponent(path); } catch (error) {}
    var input = path.split('/');
    var output = [];
    for (var index = 0; index < input.length; index++) {
        var part = input[index];
        if (!part || part === '.') continue;
        if (part === '..') {
            if (!output.length) throw new Error('Đường dẫn EPUB không hợp lệ');
            output.pop();
        } else {
            output.push(part);
        }
    }
    return output.join('/');
}

function epubResolvePath(base, href) {
    href = String(href || '');
    var prefix = href.charAt(0) === '/' ? '' : String(base || '').replace(/[^/]*$/, '');
    return epubNormalizePath(prefix + href);
}

function epubOpen(base64) {
    var source = epubBase64Binary(base64);
    if (source.length < 22 || epubU32(source, 0) !== 0x04034b50) throw new Error('Tệp tải về không phải EPUB hợp lệ');

    var minimum = Math.max(0, source.length - 65557);
    var eocd = -1;
    for (var offset = source.length - 22; offset >= minimum; offset--) {
        if (epubU32(source, offset) === 0x06054b50) {
            eocd = offset;
            break;
        }
    }
    if (eocd < 0) throw new Error('Không tìm thấy thư mục ZIP của EPUB');

    var disk = epubU16(source, eocd + 4);
    var centralDisk = epubU16(source, eocd + 6);
    var diskFiles = epubU16(source, eocd + 8);
    var fileCount = epubU16(source, eocd + 10);
    var centralSize = epubU32(source, eocd + 12);
    var centralOffset = epubU32(source, eocd + 16);
    if (disk || centralDisk || diskFiles !== fileCount || fileCount === 65535 || centralOffset === 0xffffffff || centralSize === 0xffffffff) throw new Error('EPUB ZIP64 hoặc nhiều phần chưa được hỗ trợ');
    if (!fileCount || fileCount > EPUB_MAX_FILES) throw new Error('Số tệp trong EPUB không hợp lệ');
    epubNeed(source, centralOffset, centralSize, 'Thư mục ZIP của EPUB bị hỏng');

    var files = {};
    var entries = [];
    var cursor = centralOffset;
    for (var index = 0; index < fileCount; index++) {
        if (epubU32(source, cursor) !== 0x02014b50) throw new Error('Thư mục ZIP của EPUB bị hỏng');
        var flags = epubU16(source, cursor + 8);
        var method = epubU16(source, cursor + 10);
        var crc = epubU32(source, cursor + 16);
        var compressedSize = epubU32(source, cursor + 20);
        var size = epubU32(source, cursor + 24);
        var nameLength = epubU16(source, cursor + 28);
        var extraLength = epubU16(source, cursor + 30);
        var commentLength = epubU16(source, cursor + 32);
        var localOffset = epubU32(source, cursor + 42);
        epubNeed(source, cursor + 46, nameLength + extraLength + commentLength, 'Mục ZIP của EPUB bị hỏng');
        var name = epubNormalizePath(epubZipName(source, cursor + 46, nameLength, (flags & 2048) !== 0));
        if (name && name.charAt(name.length - 1) !== '/') {
            if (files[name]) throw new Error('EPUB chứa đường dẫn trùng lặp');
            var entry = { name: name, flags: flags, method: method, crc: crc, compressedSize: compressedSize, size: size, offset: localOffset };
            files[name] = entry;
            entries.push(entry);
        }
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    if (cursor > centralOffset + centralSize) throw new Error('Thư mục ZIP của EPUB bị hỏng');
    return { source: source, files: files, entries: entries };
}

function epubCrc32(bytes) {
    if (!EPUB_CRC_TABLE) {
        EPUB_CRC_TABLE = [];
        for (var index = 0; index < 256; index++) {
            var value = index;
            for (var bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
            EPUB_CRC_TABLE[index] = value >>> 0;
        }
    }
    var crc = 0xffffffff;
    for (var position = 0; position < bytes.length; position++) crc = EPUB_CRC_TABLE[(crc ^ bytes[position]) & 255] ^ crc >>> 8;
    return (crc ^ 0xffffffff) >>> 0;
}

function epubBitReader(source, start, end) {
    return { source: source, position: start, end: end, bits: 0, count: 0 };
}

function epubReadBits(reader, count) {
    while (reader.count < count) {
        if (reader.position >= reader.end) throw new Error('Dữ liệu DEFLATE bị cắt ngắn');
        reader.bits |= reader.source.charCodeAt(reader.position++) << reader.count;
        reader.count += 8;
    }
    var value = reader.bits & (1 << count) - 1;
    reader.bits >>>= count;
    reader.count -= count;
    return value;
}

function epubHuffman(lengths) {
    var max = 0;
    var counts = [0];
    var index;
    for (index = 0; index < lengths.length; index++) {
        var length = lengths[index];
        if (length > max) max = length;
        counts[length] = (counts[length] || 0) + 1;
    }
    if (!max) return null;
    counts[0] = 0;

    var left = 1;
    for (index = 1; index <= max; index++) {
        left = (left << 1) - (counts[index] || 0);
        if (left < 0) throw new Error('Bảng Huffman DEFLATE không hợp lệ');
    }

    var next = [];
    var code = 0;
    for (index = 1; index <= max; index++) {
        code = (code + (counts[index - 1] || 0)) << 1;
        next[index] = code;
    }

    var root = {};
    for (var symbol = 0; symbol < lengths.length; symbol++) {
        length = lengths[symbol];
        if (!length) continue;
        code = next[length]++;
        var node = root;
        for (var depth = length - 1; depth >= 0; depth--) {
            var key = code >> depth & 1 ? 'one' : 'zero';
            if (!node[key]) node[key] = {};
            node = node[key];
        }
        if (typeof node.symbol === 'number') throw new Error('Bảng Huffman DEFLATE bị trùng');
        node.symbol = symbol;
    }
    root.max = max;
    return root;
}

function epubHuffmanSymbol(reader, tree) {
    if (!tree) throw new Error('Thiếu bảng Huffman DEFLATE');
    var node = tree;
    for (var depth = 0; depth <= tree.max; depth++) {
        if (typeof node.symbol === 'number') return node.symbol;
        node = epubReadBits(reader, 1) ? node.one : node.zero;
        if (!node) throw new Error('Mã Huffman DEFLATE không hợp lệ');
    }
    throw new Error('Mã Huffman DEFLATE quá dài');
}

function epubFixedTrees() {
    if (EPUB_FIXED_TREES) return EPUB_FIXED_TREES;
    var literal = [];
    var distance = [];
    var index;
    for (index = 0; index <= 287; index++) literal[index] = index <= 143 ? 8 : index <= 255 ? 9 : index <= 279 ? 7 : 8;
    for (index = 0; index < 32; index++) distance[index] = 5;
    EPUB_FIXED_TREES = { literal: epubHuffman(literal), distance: epubHuffman(distance) };
    return EPUB_FIXED_TREES;
}

function epubDynamicTrees(reader) {
    var literalCount = epubReadBits(reader, 5) + 257;
    var distanceCount = epubReadBits(reader, 5) + 1;
    var codeCount = epubReadBits(reader, 4) + 4;
    var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    var codeLengths = [];
    var index;
    for (index = 0; index < 19; index++) codeLengths[index] = 0;
    for (index = 0; index < codeCount; index++) codeLengths[order[index]] = epubReadBits(reader, 3);
    var codeTree = epubHuffman(codeLengths);
    var lengths = [];
    var total = literalCount + distanceCount;

    while (lengths.length < total) {
        var symbol = epubHuffmanSymbol(reader, codeTree);
        var repeat;
        var value;
        if (symbol <= 15) {
            lengths.push(symbol);
            continue;
        }
        if (symbol === 16) {
            if (!lengths.length) throw new Error('Mã lặp DEFLATE không hợp lệ');
            repeat = epubReadBits(reader, 2) + 3;
            value = lengths[lengths.length - 1];
        } else if (symbol === 17) {
            repeat = epubReadBits(reader, 3) + 3;
            value = 0;
        } else if (symbol === 18) {
            repeat = epubReadBits(reader, 7) + 11;
            value = 0;
        } else {
            throw new Error('Mã độ dài DEFLATE không hợp lệ');
        }
        if (lengths.length + repeat > total) throw new Error('Bảng DEFLATE vượt quá kích thước');
        while (repeat--) lengths.push(value);
    }

    var literalLengths = lengths.slice(0, literalCount);
    if (!literalLengths[256]) throw new Error('DEFLATE thiếu mã kết thúc');
    return { literal: epubHuffman(literalLengths), distance: epubHuffman(lengths.slice(literalCount)) };
}

function epubInflate(source, start, end, expectedSize) {
    var reader = epubBitReader(source, start, end);
    var output = [];
    var last = false;
    var lengthBase = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
    var lengthExtra = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
    var distanceBase = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
    var distanceExtra = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

    while (!last) {
        last = epubReadBits(reader, 1) !== 0;
        var type = epubReadBits(reader, 2);
        if (type === 0) {
            reader.bits = 0;
            reader.count = 0;
            epubNeed(source, reader.position, 4, 'Khối DEFLATE bị cắt ngắn');
            var size = epubU16(source, reader.position);
            var inverse = epubU16(source, reader.position + 2);
            reader.position += 4;
            if ((size ^ 65535) !== inverse) throw new Error('Khối DEFLATE không hợp lệ');
            epubNeed(source, reader.position, size, 'Khối DEFLATE bị cắt ngắn');
            if (output.length + size > expectedSize) throw new Error('Nội dung EPUB vượt quá kích thước khai báo');
            while (size--) output.push(source.charCodeAt(reader.position++));
            continue;
        }
        if (type === 3) throw new Error('Loại khối DEFLATE không hợp lệ');

        var trees = type === 1 ? epubFixedTrees() : epubDynamicTrees(reader);
        while (true) {
            var symbol = epubHuffmanSymbol(reader, trees.literal);
            if (symbol < 256) {
                if (output.length >= expectedSize) throw new Error('Nội dung EPUB vượt quá kích thước khai báo');
                output.push(symbol);
            } else if (symbol === 256) {
                break;
            } else {
                var lengthIndex = symbol - 257;
                if (lengthIndex < 0 || lengthIndex >= lengthBase.length) throw new Error('Độ dài DEFLATE không hợp lệ');
                var length = lengthBase[lengthIndex] + epubReadBits(reader, lengthExtra[lengthIndex]);
                var distanceSymbol = epubHuffmanSymbol(reader, trees.distance);
                if (distanceSymbol >= distanceBase.length) throw new Error('Khoảng cách DEFLATE không hợp lệ');
                var distance = distanceBase[distanceSymbol] + epubReadBits(reader, distanceExtra[distanceSymbol]);
                if (distance > output.length || output.length + length > expectedSize) throw new Error('Tham chiếu DEFLATE không hợp lệ');
                while (length--) output.push(output[output.length - distance]);
            }
        }
    }
    if (output.length !== expectedSize) throw new Error('Kích thước nội dung EPUB không khớp');
    return output;
}

function epubExtract(zip, entry, maximum) {
    if (!entry) throw new Error('Thiếu tệp bắt buộc trong EPUB');
    var max = typeof maximum === 'number' ? maximum : EPUB_MAX_ENTRY;
    if (entry.size > max) throw new Error('Một phần văn bản EPUB quá lớn để xử lý');
    if (entry.flags & 1) throw new Error('EPUB được mã hóa nên không thể đọc');
    if (entry.method !== 0 && entry.method !== 8) throw new Error('Kiểu nén EPUB chưa được hỗ trợ');
    if (epubU32(zip.source, entry.offset) !== 0x04034b50) throw new Error('Mục ZIP cục bộ của EPUB bị hỏng');
    var nameLength = epubU16(zip.source, entry.offset + 26);
    var extraLength = epubU16(zip.source, entry.offset + 28);
    var start = entry.offset + 30 + nameLength + extraLength;
    epubNeed(zip.source, start, entry.compressedSize, 'Dữ liệu tệp EPUB bị cắt ngắn');

    var bytes = [];
    if (entry.method === 0) {
        if (entry.compressedSize !== entry.size) throw new Error('Kích thước tệp EPUB không khớp');
        for (var index = start; index < start + entry.size; index++) bytes.push(zip.source.charCodeAt(index));
    } else {
        bytes = epubInflate(zip.source, start, start + entry.compressedSize, entry.size);
    }
    if (epubCrc32(bytes) !== entry.crc) throw new Error('Kiểm tra CRC của EPUB thất bại');
    return bytes;
}

function epubFirst(root, selector) {
    return root.select(selector).first();
}

function epubPackage(base64) {
    var zip = epubOpen(base64);
    var containerEntry = zip.files['META-INF/container.xml'];
    var container = Html.parse(epubText(epubExtract(zip, containerEntry, 1024 * 1024)));
    var rootfile = epubFirst(container, 'rootfile[full-path]');
    if (!rootfile) throw new Error('EPUB thiếu đường dẫn gói nội dung');
    var opfPath = epubNormalizePath(rootfile.attr('full-path'));
    var opf = Html.parse(epubText(epubExtract(zip, zip.files[opfPath], 4 * 1024 * 1024)));

    var titleElement = epubFirst(opf, 'metadata title, dc\\:title, title');
    var title = titleElement ? cleanText(titleElement.text()) : '';
    var coverMeta = epubFirst(opf, 'meta[name="cover"]');
    var coverId = coverMeta ? trimText(coverMeta.attr('content')) : '';
    var guideCover = epubFirst(opf, 'guide reference[type="cover"]');
    var coverPath = guideCover ? epubResolvePath(opfPath, guideCover.attr('href')) : '';
    var manifest = {};

    opf.select('manifest item[id][href]').forEach(function (item) {
        var id = trimText(item.attr('id'));
        if (!id || manifest[id]) return;
        manifest[id] = {
            id: id,
            path: epubResolvePath(opfPath, item.attr('href')),
            media: trimText(item.attr('media-type')).toLowerCase()
        };
    });

    var spine = [];
    opf.select('spine itemref[idref]').forEach(function (itemref) {
        var id = trimText(itemref.attr('idref'));
        var item = manifest[id];
        if (!item || trimText(itemref.attr('linear')).toLowerCase() === 'no') return;
        if (item.media !== 'application/xhtml+xml' && !/\.x?html?$/i.test(item.path)) return;
        if (!zip.files[item.path]) throw new Error('EPUB thiếu phần nội dung: ' + item.path);
        spine.push({ id: id, path: item.path, cover: id === coverId || item.path === coverPath });
    });
    if (!spine.length) throw new Error('EPUB không có phần văn bản nào');
    return { zip: zip, title: title, spine: spine };
}

function epubSafeHtml(html) {
    var allowed = '|p|br|div|span|h1|h2|h3|h4|h5|h6|blockquote|pre|code|em|strong|b|i|u|s|strike|sub|sup|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|th|td|hr|ruby|rt|rp|q|';
    return String(html || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(\/?)([a-z][a-z0-9:-]*)(?:\s+(?:[^"'<>]|"[^"]*"|'[^']*')*)?\s*\/?>/gi, function (tag, closing, name) {
        name = String(name).toLowerCase();
        if (allowed.indexOf('|' + name + '|') < 0) return '';
        if (name === 'br' || name === 'hr') return closing ? '' : '<' + name + '>';
        return '<' + closing + name + '>';
    });
}

function epubCleanDocument(text) {
    text = String(text || '').replace(/https?:\/\/(?:www\.)?thuviensach\.vn\/?/gi, '');
    var doc = Html.parse(text);
    var body = epubFirst(doc, 'body');
    if (!body) throw new Error('Phần EPUB không có nội dung HTML');
    body.select('script, style, noscript, iframe, object, embed, form, input, button, svg, canvas, link, meta, img, picture, source, video, audio').forEach(function (element) {
        element.remove();
    });
    var visible = cleanText(body.text());
    var heading = epubFirst(body, 'h1, h2, h3');
    var title = heading ? cleanText(heading.text()) : '';
    if (!title) {
        var titleElement = epubFirst(doc, 'title');
        title = titleElement ? cleanText(titleElement.text()) : '';
    }
    if (title.length > 120 || /^(?:index|untitled|document\s*outline|table\s*of\s*contents|mục\s*lục)$/i.test(title) || /^https?:\/\//i.test(title)) title = '';
    return { html: trimText(epubSafeHtml(body.html())), text: visible, title: title };
}

function epubChapterList(base64) {
    var book = epubPackage(base64);
    var chapters = [];
    for (var index = 0; index < book.spine.length; index++) {
        var item = book.spine[index];
        if (item.cover) continue;
        var document = epubCleanDocument(epubText(epubExtract(book.zip, book.zip.files[item.path])));
        if (!document.text || /^(?:document\s*outline|table\s*of\s*contents|mục\s*lục)(?:\s*notes)?$/i.test(document.text)) continue;
        chapters.push({ path: item.path, name: document.title || 'Phần ' + (chapters.length + 1) });
    }
    if (!chapters.length) throw new Error('EPUB không có văn bản có thể đọc');
    return chapters;
}

function epubChapterContent(base64, path) {
    path = epubNormalizePath(path);
    var book = epubPackage(base64);
    var allowed = false;
    var position = 0;
    for (var index = 0; index < book.spine.length; index++) {
        if (!book.spine[index].cover) position++;
        if (book.spine[index].path === path && !book.spine[index].cover) {
            allowed = true;
            break;
        }
    }
    if (!allowed) throw new Error('Phần EPUB không hợp lệ');
    var document = epubCleanDocument(epubText(epubExtract(book.zip, book.zip.files[path])));
    if (!document.text || /^(?:document\s*outline|table\s*of\s*contents|mục\s*lục)(?:\s*notes)?$/i.test(document.text)) throw new Error('Phần EPUB không có văn bản');
    return { html: document.html, title: document.title || 'Phần ' + position };
}
