package com.devcollab.backend.dto.request;

import lombok.Data;

@Data
public class MessageRequest {
    private String content;
    private String codeContent;
    private String language;
    private Long parentMessageId;
    private String attachmentUrl;
    private String attachmentName;
}
