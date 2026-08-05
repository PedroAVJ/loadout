package main

import (
	"crypto/sha256"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"google.golang.org/protobuf/proto"
)

func TestSenderToParticipantResolvesBareStoredLID(t *testing.T) {
	storeDir := t.TempDir()
	t.Setenv("WHATSAPP_MCP_STORE_DIR", storeDir)

	db, err := sql.Open("sqlite3", filepath.Join(storeDir, "whatsapp.db"))
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer db.Close()

	if _, err := db.Exec("CREATE TABLE whatsmeow_lid_map (lid TEXT PRIMARY KEY, pn TEXT UNIQUE NOT NULL)"); err != nil {
		t.Fatalf("CREATE TABLE error = %v", err)
	}
	if _, err := db.Exec("INSERT INTO whatsmeow_lid_map (lid, pn) VALUES (?, ?)", "99900123456789", "15551230001"); err != nil {
		t.Fatalf("INSERT error = %v", err)
	}

	if got := senderToParticipant("99900123456789"); got != "99900123456789@lid" {
		t.Fatalf("senderToParticipant() = %q, want LID participant", got)
	}
}

func TestSenderToParticipantFallsBackToPhoneJID(t *testing.T) {
	t.Setenv("WHATSAPP_MCP_STORE_DIR", t.TempDir())

	if got := senderToParticipant("15551230001"); got != "15551230001@s.whatsapp.net" {
		t.Fatalf("senderToParticipant() = %q, want phone participant", got)
	}
}

func TestMessageSenderJIDPreservesGroupLIDParticipant(t *testing.T) {
	sender := types.NewJID("99900123456789", types.HiddenUserServer)
	chat := types.NewJID("120363424447729748", types.GroupServer)

	if got := messageSenderJID(sender, chat); got != "99900123456789@lid" {
		t.Fatalf("messageSenderJID() = %q, want full LID JID", got)
	}
}

func TestMessageSenderJIDFallsBackToDirectChatJID(t *testing.T) {
	chat := types.NewJID("15551230001", types.DefaultUserServer)

	if got := messageSenderJID(types.JID{}, chat); got != "15551230001@s.whatsapp.net" {
		t.Fatalf("messageSenderJID() = %q, want direct chat JID", got)
	}
}

func TestExtractReactionMetadataReadsPlainReaction(t *testing.T) {
	timestamp := time.Unix(1_700_000_000, 0)
	evt := &events.Message{
		Info: types.MessageInfo{
			MessageSource: types.MessageSource{
				Chat:   types.NewJID("120363424447729748", types.GroupServer),
				Sender: types.NewJID("15551230001", types.DefaultUserServer),
			},
			ID:        types.MessageID("REACTION-ID"),
			Timestamp: timestamp,
		},
		Message: &waProto.Message{
			ReactionMessage: &waProto.ReactionMessage{
				Key: &waProto.MessageKey{
					RemoteJID:   proto.String("120363424447729748@g.us"),
					ID:          proto.String("TARGET-ID"),
					Participant: proto.String("15550987654@s.whatsapp.net"),
				},
				Text:              proto.String("+1"),
				GroupingKey:       proto.String("grouping-key"),
				SenderTimestampMS: proto.Int64(1_700_000_001_000),
			},
		},
	}

	reaction, ok := extractReactionMetadata(nil, evt, "REACTION-ID", evt.Message, nil)
	if !ok {
		t.Fatal("extractReactionMetadata() did not detect reaction")
	}
	if reaction.ChatJID != "120363424447729748@g.us" {
		t.Fatalf("ChatJID = %q", reaction.ChatJID)
	}
	if reaction.TargetMessageID != "TARGET-ID" {
		t.Fatalf("TargetMessageID = %q", reaction.TargetMessageID)
	}
	if reaction.TargetSender != "15550987654@s.whatsapp.net" {
		t.Fatalf("TargetSender = %q", reaction.TargetSender)
	}
	if reaction.Sender != "15551230001@s.whatsapp.net" {
		t.Fatalf("Sender = %q", reaction.Sender)
	}
	if reaction.Emoji != "+1" {
		t.Fatalf("Emoji = %q", reaction.Emoji)
	}
	if reaction.GroupingKey != "grouping-key" {
		t.Fatalf("GroupingKey = %q", reaction.GroupingKey)
	}
	if !reaction.Timestamp.Equal(timestamp) {
		t.Fatalf("Timestamp = %s, want %s", reaction.Timestamp, timestamp)
	}
}

func TestStoreReactionUpsertsAndRemovesCurrentReaction(t *testing.T) {
	t.Setenv("WHATSAPP_MCP_STORE_DIR", t.TempDir())

	store, err := NewMessageStore()
	if err != nil {
		t.Fatalf("NewMessageStore() error = %v", err)
	}
	defer store.Close()

	reaction := ReactionMetadata{
		ReactionMessageID: "REACTION-ID",
		ChatJID:           "chat@g.us",
		TargetMessageID:   "TARGET-ID",
		Sender:            "15551230001@s.whatsapp.net",
		Emoji:             "+1",
		Timestamp:         time.Unix(1_700_000_000, 0),
	}
	if err := store.StoreReaction(reaction); err != nil {
		t.Fatalf("StoreReaction() error = %v", err)
	}

	reaction.ReactionMessageID = "REACTION-ID-2"
	reaction.Emoji = "ok"
	if err := store.StoreReaction(reaction); err != nil {
		t.Fatalf("StoreReaction() update error = %v", err)
	}

	var emoji string
	var count int
	if err := store.db.QueryRow("SELECT emoji, COUNT(*) FROM message_reactions WHERE chat_jid = ? AND target_message_id = ?", "chat@g.us", "TARGET-ID").Scan(&emoji, &count); err != nil {
		t.Fatalf("SELECT reaction error = %v", err)
	}
	if emoji != "ok" || count != 1 {
		t.Fatalf("reaction row = (%q, %d), want (ok, 1)", emoji, count)
	}

	reaction.Emoji = ""
	if err := store.StoreReaction(reaction); err != nil {
		t.Fatalf("StoreReaction() remove error = %v", err)
	}
	if err := store.db.QueryRow("SELECT COUNT(*) FROM message_reactions").Scan(&count); err != nil {
		t.Fatalf("COUNT reactions error = %v", err)
	}
	if count != 0 {
		t.Fatalf("reaction count = %d, want 0", count)
	}
}

func TestStoreReceiptPersistsReadReceipt(t *testing.T) {
	t.Setenv("WHATSAPP_MCP_STORE_DIR", t.TempDir())

	store, err := NewMessageStore()
	if err != nil {
		t.Fatalf("NewMessageStore() error = %v", err)
	}
	defer store.Close()

	timestamp := time.Unix(1_700_000_000, 0)
	if err := store.StoreReceipt(
		"MSG-ID",
		"15550987654@s.whatsapp.net",
		normalizeReceiptType(types.ReceiptTypeRead),
		"15550987654@s.whatsapp.net",
		"me",
		timestamp,
	); err != nil {
		t.Fatalf("StoreReceipt() error = %v", err)
	}

	var receiptType, receiptSender, messageSender string
	if err := store.db.QueryRow("SELECT receipt_type, receipt_sender, message_sender FROM message_receipts WHERE message_id = ?", "MSG-ID").Scan(&receiptType, &receiptSender, &messageSender); err != nil {
		t.Fatalf("SELECT receipt error = %v", err)
	}
	if receiptType != "read" || receiptSender != "15550987654@s.whatsapp.net" || messageSender != "me" {
		t.Fatalf("receipt row = (%q, %q, %q)", receiptType, receiptSender, messageSender)
	}
}

func TestBuildReplyContextPreservesFullParticipantJID(t *testing.T) {
	contextInfo := buildReplyContext(ReplyMetadata{
		MessageID: "3AEE6D27A072B2867813",
		Sender:    "99900123456789@lid",
		Content:   "quoted text",
	})

	if contextInfo == nil {
		t.Fatal("buildReplyContext() returned nil")
	}
	if got := contextInfo.GetParticipant(); got != "99900123456789@lid" {
		t.Fatalf("Participant = %q, want full LID JID", got)
	}
	if got := contextInfo.GetStanzaID(); got != "3AEE6D27A072B2867813" {
		t.Fatalf("StanzaID = %q", got)
	}
}

func TestExtractTextContentReadsMediaCaptions(t *testing.T) {
	tests := []struct {
		name string
		msg  *waProto.Message
		want string
	}{
		{
			name: "conversation text",
			msg: &waProto.Message{
				Conversation: proto.String("plain text"),
			},
			want: "plain text",
		},
		{
			name: "extended text",
			msg: &waProto.Message{
				ExtendedTextMessage: &waProto.ExtendedTextMessage{
					Text: proto.String("rich text"),
				},
			},
			want: "rich text",
		},
		{
			name: "image caption",
			msg: &waProto.Message{
				ImageMessage: &waProto.ImageMessage{
					Caption: proto.String("image caption"),
				},
			},
			want: "image caption",
		},
		{
			name: "video caption",
			msg: &waProto.Message{
				VideoMessage: &waProto.VideoMessage{
					Caption: proto.String("video caption"),
				},
			},
			want: "video caption",
		},
		{
			name: "document caption",
			msg: &waProto.Message{
				DocumentMessage: &waProto.DocumentMessage{
					Caption: proto.String("document caption"),
				},
			},
			want: "document caption",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := extractTextContent(tt.msg); got != tt.want {
				t.Fatalf("extractTextContent() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestResolveOutboundMediaType(t *testing.T) {
	tests := []struct {
		name          string
		path          string
		wantMediaType whatsmeow.MediaType
		wantMIMEType  string
	}{
		{
			name:          "PDF is an actual PDF document",
			path:          "/tmp/Guide.PDF",
			wantMediaType: whatsmeow.MediaDocument,
			wantMIMEType:  "application/pdf",
		},
		{
			name:          "JPEG remains an image",
			path:          "/tmp/photo.jpg",
			wantMediaType: whatsmeow.MediaImage,
			wantMIMEType:  "image/jpeg",
		},
		{
			name:          "unknown documents remain generic binary",
			path:          "/tmp/archive.unknown",
			wantMediaType: whatsmeow.MediaDocument,
			wantMIMEType:  "application/octet-stream",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mediaType, mimeType := resolveOutboundMediaType(tt.path)
			if mediaType != tt.wantMediaType {
				t.Fatalf("mediaType = %v, want %v", mediaType, tt.wantMediaType)
			}
			if mimeType != tt.wantMIMEType {
				t.Fatalf("mimeType = %q, want %q", mimeType, tt.wantMIMEType)
			}
		})
	}
}

func TestBuildMediaFilenameUsesMessageID(t *testing.T) {
	tests := []struct {
		name         string
		mediaType    string
		messageID    string
		originalName string
		want         string
	}{
		{
			name:      "image filename",
			mediaType: "image",
			messageID: "3A7F7B003B26545A2A5C",
			want:      "image_3A7F7B003B26545A2A5C.jpg",
		},
		{
			name:      "video filename",
			mediaType: "video",
			messageID: "ABC123",
			want:      "video_ABC123.mp4",
		},
		{
			name:      "audio filename",
			mediaType: "audio",
			messageID: "ABC:123/456",
			want:      "audio_ABC_123_456.ogg",
		},
		{
			name:         "document keeps provided name",
			mediaType:    "document",
			messageID:    "DOC123",
			originalName: "invoice.pdf",
			want:         "invoice.pdf",
		},
		{
			name:      "document fallback uses message id",
			mediaType: "document",
			messageID: "DOC123",
			want:      "document_DOC123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildMediaFilename(tt.mediaType, tt.messageID, tt.originalName); got != tt.want {
				t.Fatalf("buildMediaFilename() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestResolveDownloadFilenameUsesCanonicalMediaName(t *testing.T) {
	tests := []struct {
		name         string
		mediaType    string
		messageID    string
		storedName   string
		wantFilename string
	}{
		{
			name:         "image ignores stale stored name",
			mediaType:    "image",
			messageID:    "3AB93D8B95628CB5EEE9",
			storedName:   "image_20260330_165202.jpg",
			wantFilename: "image_3AB93D8B95628CB5EEE9.jpg",
		},
		{
			name:         "document keeps provided name",
			mediaType:    "document",
			messageID:    "DOC123",
			storedName:   "invoice.pdf",
			wantFilename: "invoice.pdf",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := resolveDownloadFilename(tt.mediaType, tt.messageID, tt.storedName); got != tt.wantFilename {
				t.Fatalf("resolveDownloadFilename() = %q, want %q", got, tt.wantFilename)
			}
		})
	}
}

func TestFileMatchesStoredSHA256(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "sample.jpg")
	data := []byte("not really a jpeg, but enough for hashing")

	if err := os.WriteFile(filePath, data, 0o644); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}

	expected := sha256.Sum256(data)
	matches, err := fileMatchesStoredSHA256(filePath, expected[:])
	if err != nil {
		t.Fatalf("fileMatchesStoredSHA256() unexpected error = %v", err)
	}
	if !matches {
		t.Fatalf("fileMatchesStoredSHA256() = false, want true")
	}

	wrong := sha256.Sum256([]byte("different"))
	matches, err = fileMatchesStoredSHA256(filePath, wrong[:])
	if err != nil {
		t.Fatalf("fileMatchesStoredSHA256() unexpected error = %v", err)
	}
	if matches {
		t.Fatalf("fileMatchesStoredSHA256() = true, want false")
	}
}

func TestNormalizeMessageForStorageUsesOriginalIDAndEditedPayload(t *testing.T) {
	editedPayload := &waProto.Message{
		ImageMessage: &waProto.ImageMessage{
			Caption: proto.String("edited caption"),
		},
	}

	evt := &events.Message{
		Info: types.MessageInfo{
			ID:        types.MessageID("EDIT-STANZA-ID"),
			Timestamp: time.Unix(1_700_000_000, 0),
		},
		IsEdit: true,
		Message: &waProto.Message{
			ProtocolMessage: &waProto.ProtocolMessage{
				Type: waProto.ProtocolMessage_MESSAGE_EDIT.Enum(),
				Key: &waProto.MessageKey{
					ID: proto.String("ORIGINAL-ID"),
				},
				EditedMessage: editedPayload,
			},
		},
	}

	gotID, gotMessage := normalizeMessageForStorage(evt)
	if gotID != "ORIGINAL-ID" {
		t.Fatalf("normalizeMessageForStorage() id = %q, want %q", gotID, "ORIGINAL-ID")
	}
	if gotMessage != editedPayload {
		t.Fatalf("normalizeMessageForStorage() message payload was not rewritten to edited content")
	}
	if gotCaption := extractTextContent(gotMessage); gotCaption != "edited caption" {
		t.Fatalf("extractTextContent(normalized) = %q, want %q", gotCaption, "edited caption")
	}
}

func TestNormalizeMessageForStorageLeavesRegularMessagesUntouched(t *testing.T) {
	regular := &waProto.Message{
		Conversation: proto.String("plain text"),
	}
	evt := &events.Message{
		Info: types.MessageInfo{
			ID: types.MessageID("REGULAR-ID"),
		},
		Message: regular,
	}

	gotID, gotMessage := normalizeMessageForStorage(evt)
	if gotID != "REGULAR-ID" {
		t.Fatalf("normalizeMessageForStorage() id = %q, want %q", gotID, "REGULAR-ID")
	}
	if gotMessage != regular {
		t.Fatalf("normalizeMessageForStorage() changed a regular message payload unexpectedly")
	}
}

func TestStoreSentMessagePersistsOutboundText(t *testing.T) {
	t.Setenv("WHATSAPP_MCP_STORE_DIR", t.TempDir())

	store, err := NewMessageStore()
	if err != nil {
		t.Fatalf("NewMessageStore() error = %v", err)
	}
	defer store.Close()

	chat := types.JID{User: "99900123456789", Server: "lid"}
	timestamp := time.Unix(1_700_000_000, 0)
	msg := &waProto.Message{Conversation: proto.String("outbound text")}

	if err := storeSentMessage(store, "15551230001@s.whatsapp.net", chat, "SENT-ID", timestamp, msg, ReplyMetadata{}); err != nil {
		t.Fatalf("storeSentMessage() error = %v", err)
	}

	var content, sender string
	var isFromMe bool
	if err := store.db.QueryRow(
		"SELECT content, sender, is_from_me FROM messages WHERE id = ? AND chat_jid = ?",
		"SENT-ID", chat.String(),
	).Scan(&content, &sender, &isFromMe); err != nil {
		t.Fatalf("SELECT sent message error = %v", err)
	}
	if content != "outbound text" || sender != "15551230001@s.whatsapp.net" || !isFromMe {
		t.Fatalf("sent message row = (%q, %q, %v), want (outbound text, 15551230001@s.whatsapp.net, true)", content, sender, isFromMe)
	}

	var chatCount int
	if err := store.db.QueryRow("SELECT COUNT(*) FROM chats WHERE jid = ?", chat.String()).Scan(&chatCount); err != nil {
		t.Fatalf("SELECT chat error = %v", err)
	}
	if chatCount != 1 {
		t.Fatalf("chat rows = %d, want 1 (own sends must also upsert the chat)", chatCount)
	}
}
