from github import Github
from datetime import datetime, timedelta
from collections import Counter
import os
from dotenv import load_dotenv

load_dotenv()

class GitHubAnalyzer:
    def __init__(self, token: str = None):
        self.token = token or os.getenv("GITHUB_TOKEN")
        self.client = Github(self.token) if self.token else None

    def analyze_user(self, username: str) -> dict:
        """Analyze a GitHub user's repos and activity"""
        if not self.client:
            return {"error": "GitHub token not configured"}

        try:
            user = self.client.get_user(username)
            repos = list(user.get_repos())

            # Time threshold for "active" repos
            three_months_ago = datetime.now() - timedelta(days=90)

            active_repos = []
            total_commits = 0
            languages = Counter()
            started_not_finished = []

            for repo in repos:
                if repo.fork:
                    continue

                # Check if repo is active
                last_push = repo.pushed_at
                # Ensure last_push is timezone-aware or make three_months_ago offset-naive
                # Assuming repo.pushed_at is offset-naive UTC or comparing doesn't need timezone
                is_active = last_push and last_push.replace(tzinfo=None) > three_months_ago if last_push.tzinfo else last_push and last_push > three_months_ago


                if is_active:
                    active_repos.append(repo.name)

                # Count commits (handle potential exceptions more gracefully)
                # Only count commits if the repo seems to have content
                if repo.size > 0:
                    try:
                        # Fetch commits efficiently, maybe limit further if hitting rate limits
                        commits = list(repo.get_commits().get_page(0)[:100]) # Get first page up to 100
                        total_commits += len(commits)
                    except Exception as commit_error:
                         # Log this error if needed, but don't stop analysis
                        print(f"!!! Warning: Could not fetch commits for repo {repo.name}: {commit_error}")
                        pass # Continue analyzing other aspects

                # Language stats
                if repo.language:
                    languages[repo.language] += 1

                # Detect tutorial hell / unfinished projects
                # Ensure created_at is timezone-aware or make comparison offset-naive
                created_at_naive = repo.created_at.replace(tzinfo=None) if repo.created_at.tzinfo else repo.created_at
                if repo.size > 0 and not is_active and created_at_naive > (datetime.now() - timedelta(days=180)):
                    started_not_finished.append({
                        "name": repo.name,
                        "started": repo.created_at.strftime("%Y-%m-%d"),
                        "last_activity": last_push.strftime("%Y-%m-%d") if last_push else "Unknown"
                    })

            # Detect patterns
            patterns = self._detect_patterns(
                total_repos=len(repos),
                active_repos=len(active_repos),
                started_not_finished=len(started_not_finished),
                languages=languages
            )

            return {
                "username": username,
                "total_repos": len(repos),
                "active_repos": len(active_repos),
                "total_commits": total_commits,
                "languages": dict(languages.most_common(5)),
                "started_not_finished": started_not_finished[:5], # Limit to 5 examples
                "patterns": patterns,
                "profile_url": user.html_url
            }

        except Exception as e:
            # --- DEBUGGING LINE ADDED HERE ---
            print(f"!!! GitHubAnalyzer Error: {type(e).__name__} - {str(e)}")
            # Consider more specific exception handling (e.g., RateLimitExceededException, UnknownObjectException)
            return {"error": f"Failed to analyze GitHub user: {str(e)}"}

    def _detect_patterns(self, total_repos, active_repos, started_not_finished, languages):
        """Detect behavioral patterns from GitHub data"""
        patterns = []

        # Ensure total_repos is not zero before dividing
        active_percentage = (active_repos / total_repos * 100) if total_repos > 0 else 0

        # Tutorial hell detection
        # Check against a percentage or a higher absolute number if total_repos is large
        if started_not_finished > 5 and (started_not_finished / total_repos > 0.5 if total_repos > 10 else True):
             patterns.append({
                "type": "tutorial_hell",
                "severity": "high",
                "message": f"High number ({started_not_finished}) of recently started but inactive repos detected."
            })

        # Consistency issues
        if total_repos > 5 and active_percentage < 20:
            patterns.append({
                "type": "low_consistency",
                "severity": "medium",
                "message": f"Only {active_percentage:.0f}% of your repos seem active. Consider focusing on maintaining projects."
            })
        elif total_repos > 0 and active_percentage == 0:
             patterns.append({
                "type": "low_activity",
                "severity": "medium",
                "message": f"No recently active personal repositories found."
            })


        # Language focus
        if len(languages) > 5:
            patterns.append({
                "type": "shiny_object_syndrome",
                "severity": "medium",
                "message": f"Activity spread across {len(languages)} languages. Is this intentional focus or exploration?"
            })

        # Positive patterns
        if active_percentage >= 50 and total_repos > 3: # Require at least a few repos
            patterns.append({
                "type": "consistent_maintainer",
                "severity": "positive",
                "message": f"Good job maintaining activity in {active_percentage:.0f}% of your projects!"
            })
        elif languages and len(languages) <= 2:
             patterns.append({
                "type": "focused_stack",
                "severity": "positive",
                "message": f"Strong focus on {', '.join(languages.keys())}."
            })


        return patterns

    def get_recent_activity(self, username: str, days: int = 7) -> dict:
        """Get recent commit activity"""
        if not self.client:
            return {"error": "GitHub token not configured"}

        try:
            user = self.client.get_user(username)
            since = datetime.now() - timedelta(days=days)

            # PyGithub returns a PaginatedList, which is iterable
            events = user.get_events()
            commit_count = 0
            repos_touched = set()

            # Iterate safely, GitHub API might limit event history
            event_count = 0
            max_events_to_check = 300 # Limit how many events we check to avoid excessive API calls

            for event in events:
                event_count += 1
                if event_count > max_events_to_check:
                    print(f"!!! Warning: Hit max event check limit ({max_events_to_check}) for recent activity.")
                    break

                # Ensure event.created_at is offset-naive for comparison or make 'since' offset-aware
                created_at_naive = event.created_at.replace(tzinfo=None) if event.created_at.tzinfo else event.created_at
                if created_at_naive < since:
                    break # Events are usually ordered newest first

                if event.type == "PushEvent" and event.payload and 'commits' in event.payload:
                    # Check if commits list is not None and is iterable
                    commits_payload = event.payload.get("commits")
                    if commits_payload:
                         commit_count += len(commits_payload)
                    if event.repo: # Ensure repo information is present
                        repos_touched.add(event.repo.name)

            return {
                "days": days,
                "commits": commit_count,
                "repos_touched": len(repos_touched),
                "active": commit_count > 0
            }
        except Exception as e:
             # --- ADDED DEBUGGING HERE TOO ---
            print(f"!!! GitHubAnalyzer get_recent_activity Error: {type(e).__name__} - {str(e)}")
            return {"error": f"Failed to get recent activity: {str(e)}"}