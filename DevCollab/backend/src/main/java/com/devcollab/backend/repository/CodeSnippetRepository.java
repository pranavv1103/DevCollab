package com.devcollab.backend.repository;

import com.devcollab.backend.entity.CodeSnippet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CodeSnippetRepository extends JpaRepository<CodeSnippet, Long> {
}
