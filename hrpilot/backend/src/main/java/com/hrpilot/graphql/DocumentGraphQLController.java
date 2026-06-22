package com.hrpilot.graphql;

import com.hrpilot.entity.PolicyDocument;
import com.hrpilot.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;

/**
 * GraphQL resolvers for policy document queries.
 */
@Controller
@RequiredArgsConstructor
public class DocumentGraphQLController {

    private final DocumentService documentService;

    @QueryMapping
    public List<PolicyDocument> policyDocuments(@Argument UUID companyId) {
        return documentService.getDocuments(companyId);
    }

    @QueryMapping
    public PolicyDocument policyDocument(@Argument UUID id) {
        return documentService.getDocument(id);
    }

    @QueryMapping
    public List<PolicyDocument> searchDocuments(@Argument UUID companyId, @Argument String query) {
        return documentService.searchDocuments(companyId, query);
    }
}
