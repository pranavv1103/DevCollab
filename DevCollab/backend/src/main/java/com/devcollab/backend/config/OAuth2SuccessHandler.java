package com.devcollab.backend.config;

import com.devcollab.backend.entity.User;
import com.devcollab.backend.entity.UserStatus;
import com.devcollab.backend.repository.UserRepository;
import com.devcollab.backend.security.jwt.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.UUID;

/**
 * After a successful GitHub OAuth2 login:
 * 1. Find or create the local User account (matched by GitHub email).
 * 2. Issue a JWT.
 * 3. Redirect the browser to the frontend with the token as a query param.
 *    The React app reads the param, stores the JWT, and redirects to the home page.
 */
@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2SuccessHandler.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String login = oAuth2User.getAttribute("login");   // GitHub username
        String avatarUrl = oAuth2User.getAttribute("avatar_url");

        if (email == null || email.isBlank()) {
            // GitHub sometimes hides the primary email — derive a placeholder
            email = (login != null ? login : UUID.randomUUID().toString()) + "@github.oauth";
        }

        String finalEmail = email;
        User user = userRepository.findByEmail(finalEmail).orElseGet(() -> {
            // Also try matching by GitHub username in case user previously registered with the same handle
            return userRepository.findByUsername(login != null ? login : "").orElseGet(() -> {
                // New user — create account with a random password (they will use OAuth to log in)
                String username = login != null ? sanitizeUsername(login) : "user_" + UUID.randomUUID().toString().substring(0, 8);
                // Guarantee username uniqueness
                if (userRepository.existsByUsername(username)) {
                    username = username + "_" + UUID.randomUUID().toString().substring(0, 6);
                }
                User newUser = User.builder()
                        .username(username)
                        .email(finalEmail)
                        .password(UUID.randomUUID().toString()) // unusable password — OAuth only
                        .profilePictureUrl(avatarUrl)
                        .githubUrl("https://github.com/" + (login != null ? login : ""))
                        .status(UserStatus.ONLINE)
                        .build();
                return userRepository.save(newUser);
            });
        });

        String jwt = jwtUtils.generateJwtTokenFromUsername(user.getUsername());
        logger.info("OAuth2 login for user '{}'", user.getUsername());

        // Redirect to frontend; React reads ?token= and stores it
        String redirectUrl = UriComponentsBuilder
                .fromUriString("http://localhost:5182/oauth2/callback")
                .queryParam("token", jwt)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    private String sanitizeUsername(String login) {
        // Keep only alphanumeric, underscore, hyphen
        return login.replaceAll("[^a-zA-Z0-9_-]", "_");
    }
}
