from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_user_db, get_system_db
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime, timedelta
import models
from services import sage_crew

router = APIRouter()

class ProblemCreate(BaseModel):
    title: str
    difficulty: str
    pattern: str
    link: str
    mastery_level: int # 1-5
    notes: Optional[str] = None

class CodeReviewRequest(BaseModel):
    code: str
    language: str
    problem_title: str
    problem_description: Optional[str] = None

@router.post("/leetcode/log")
async def log_problem(
    problem: ProblemCreate,
    db: AsyncSession = Depends(get_user_db)
):
    # Calculate next review based on mastery (Simple SRS)
    # Level 1: 1 day, Level 2: 3 days, Level 3: 7 days, Level 4: 14 days, Level 5: 30 days
    intervals = {1: 1, 2: 3, 3: 7, 4: 14, 5: 30}
    next_review = datetime.utcnow() + timedelta(days=intervals.get(problem.mastery_level, 1))
    
    new_problem = models.LeetCodeProblem(
        title=problem.title,
        difficulty=problem.difficulty,
        pattern=problem.pattern,
        link=problem.link,
        mastery_level=problem.mastery_level,
        last_reviewed=datetime.utcnow(),
        next_review=next_review,
        notes=problem.notes
    )
    
    db.add(new_problem)
    await db.commit()
    await db.refresh(new_problem)
    
    # Log initial attempt
    log = models.RepetitionLog(
        problem_id=new_problem.id,
        quality_rating=problem.mastery_level
    )
    db.add(log)
    await db.commit()
    
    return new_problem

@router.get("/leetcode/due")
async def get_due_problems(
    db: AsyncSession = Depends(get_user_db)
):
    now = datetime.utcnow()
    result = await db.execute(select(models.LeetCodeProblem).filter(
        models.LeetCodeProblem.next_review <= now
    ).order_by(models.LeetCodeProblem.next_review))
    
    return result.scalars().all()

@router.post("/leetcode/review")
async def review_code(
    request: CodeReviewRequest,
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    try:
        review = await sage_crew.review_code(
            request.code,
            request.language,
            request.problem_title,
            request.problem_description,
            api_key=x_groq_key
        )
        return review
    except Exception as e:
        print(f"Error reviewing code: {e}")
        raise HTTPException(status_code=500, detail=f"Code review failed: {str(e)}")

@router.post("/leetcode/{problem_id}/review-log")
async def log_review(
    problem_id: int,
    quality_rating: int = Body(..., embed=True),
    db: AsyncSession = Depends(get_user_db)
):
    result = await db.execute(select(models.LeetCodeProblem).filter(models.LeetCodeProblem.id == problem_id))
    problem = result.scalars().first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Update SRS
    intervals = {0: 0, 1: 1, 2: 3, 3: 7, 4: 14, 5: 30}
    
    # If rating is 0 or 1, reset mastery or reduce it
    if quality_rating <= 1:
        problem.mastery_level = max(1, problem.mastery_level - 1)
    else:
        problem.mastery_level = min(5, problem.mastery_level + 1)
        
    problem.last_reviewed = datetime.utcnow()
    problem.next_review = datetime.utcnow() + timedelta(days=intervals.get(problem.mastery_level, 1))
    
    # Add log
    log = models.RepetitionLog(
        problem_id=problem.id,
        quality_rating=quality_rating
    )
    db.add(log)
    await db.commit()
    
    return {"message": "Review logged", "next_review": problem.next_review}

@router.delete("/leetcode/{problem_id}")
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_user_db)
):
    result = await db.execute(select(models.LeetCodeProblem).filter(models.LeetCodeProblem.id == problem_id))
    problem = result.scalars().first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    await db.delete(problem)
    await db.commit()
    
    return {"message": "Problem deleted successfully"}
@router.post("/leetcode/seed/blind75")
async def seed_blind_75(
    db: AsyncSession = Depends(get_user_db)
):
    blind_75 = [
        {"title": "Two Sum", "difficulty": "Easy", "pattern": "Array", "link": "https://leetcode.com/problems/two-sum/"},
        {"title": "Best Time to Buy and Sell Stock", "difficulty": "Easy", "pattern": "Array", "link": "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"},
        {"title": "Contains Duplicate", "difficulty": "Easy", "pattern": "Array", "link": "https://leetcode.com/problems/contains-duplicate/"},
        {"title": "Product of Array Except Self", "difficulty": "Medium", "pattern": "Array", "link": "https://leetcode.com/problems/product-of-array-except-self/"},
        {"title": "Maximum Subarray", "difficulty": "Easy", "pattern": "Array", "link": "https://leetcode.com/problems/maximum-subarray/"},
        {"title": "Maximum Product Subarray", "difficulty": "Medium", "pattern": "Array", "link": "https://leetcode.com/problems/maximum-product-subarray/"},
        {"title": "Find Minimum in Rotated Sorted Array", "difficulty": "Medium", "pattern": "Array", "link": "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/"},
        {"title": "Search in Rotated Sorted Array", "difficulty": "Medium", "pattern": "Array", "link": "https://leetcode.com/problems/search-in-rotated-sorted-array/"},
        {"title": "3Sum", "difficulty": "Medium", "pattern": "Array", "link": "https://leetcode.com/problems/3sum/"},
        {"title": "Container With Most Water", "difficulty": "Medium", "pattern": "Array", "link": "https://leetcode.com/problems/container-with-most-water/"},
        {"title": "Sum of Two Integers", "difficulty": "Medium", "pattern": "Binary", "link": "https://leetcode.com/problems/sum-of-two-integers/"},
        {"title": "Number of 1 Bits", "difficulty": "Easy", "pattern": "Binary", "link": "https://leetcode.com/problems/number-of-1-bits/"},
        {"title": "Counting Bits", "difficulty": "Easy", "pattern": "Binary", "link": "https://leetcode.com/problems/counting-bits/"},
        {"title": "Missing Number", "difficulty": "Easy", "pattern": "Binary", "link": "https://leetcode.com/problems/missing-number/"},
        {"title": "Reverse Bits", "difficulty": "Easy", "pattern": "Binary", "link": "https://leetcode.com/problems/reverse-bits/"},
        {"title": "Climbing Stairs", "difficulty": "Easy", "pattern": "DP", "link": "https://leetcode.com/problems/climbing-stairs/"},
        {"title": "Coin Change", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/coin-change/"},
        {"title": "Longest Increasing Subsequence", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/longest-increasing-subsequence/"},
        {"title": "Longest Common Subsequence", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/longest-common-subsequence/"},
        {"title": "Word Break", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/word-break/"},
        {"title": "Combination Sum", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/combination-sum/"},
        {"title": "House Robber", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/house-robber/"},
        {"title": "House Robber II", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/house-robber-ii/"},
        {"title": "Decode Ways", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/decode-ways/"},
        {"title": "Unique Paths", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/unique-paths/"},
        {"title": "Jump Game", "difficulty": "Medium", "pattern": "DP", "link": "https://leetcode.com/problems/jump-game/"},
        {"title": "Clone Graph", "difficulty": "Medium", "pattern": "Graph", "link": "https://leetcode.com/problems/clone-graph/"},
        {"title": "Course Schedule", "difficulty": "Medium", "pattern": "Graph", "link": "https://leetcode.com/problems/course-schedule/"},
        {"title": "Pacific Atlantic Water Flow", "difficulty": "Medium", "pattern": "Graph", "link": "https://leetcode.com/problems/pacific-atlantic-water-flow/"},
        {"title": "Number of Islands", "difficulty": "Medium", "pattern": "Graph", "link": "https://leetcode.com/problems/number-of-islands/"},
        {"title": "Longest Consecutive Sequence", "difficulty": "Medium", "pattern": "Graph", "link": "https://leetcode.com/problems/longest-consecutive-sequence/"},
        {"title": "Alien Dictionary", "difficulty": "Hard", "pattern": "Graph", "link": "https://leetcode.com/problems/alien-dictionary/"},
        {"title": "Graph Valid Tree", "difficulty": "Medium", "pattern": "Graph", "link": "https://leetcode.com/problems/graph-valid-tree/"},
        {"title": "Number of Connected Components in an Undirected Graph", "difficulty": "Medium", "pattern": "Graph", "link": "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/"},
        {"title": "Insert Interval", "difficulty": "Medium", "pattern": "Interval", "link": "https://leetcode.com/problems/insert-interval/"},
        {"title": "Merge Intervals", "difficulty": "Medium", "pattern": "Interval", "link": "https://leetcode.com/problems/merge-intervals/"},
        {"title": "Non-overlapping Intervals", "difficulty": "Medium", "pattern": "Interval", "link": "https://leetcode.com/problems/non-overlapping-intervals/"},
        {"title": "Meeting Rooms", "difficulty": "Easy", "pattern": "Interval", "link": "https://leetcode.com/problems/meeting-rooms/"},
        {"title": "Meeting Rooms II", "difficulty": "Medium", "pattern": "Interval", "link": "https://leetcode.com/problems/meeting-rooms-ii/"},
        {"title": "Reverse Linked List", "difficulty": "Easy", "pattern": "Linked List", "link": "https://leetcode.com/problems/reverse-linked-list/"},
        {"title": "Linked List Cycle", "difficulty": "Easy", "pattern": "Linked List", "link": "https://leetcode.com/problems/linked-list-cycle/"},
        {"title": "Merge Two Sorted Lists", "difficulty": "Easy", "pattern": "Linked List", "link": "https://leetcode.com/problems/merge-two-sorted-lists/"},
        {"title": "Merge k Sorted Lists", "difficulty": "Hard", "pattern": "Linked List", "link": "https://leetcode.com/problems/merge-k-sorted-lists/"},
        {"title": "Remove Nth Node From End of List", "difficulty": "Medium", "pattern": "Linked List", "link": "https://leetcode.com/problems/remove-nth-node-from-end-of-list/"},
        {"title": "Reorder List", "difficulty": "Medium", "pattern": "Linked List", "link": "https://leetcode.com/problems/reorder-list/"},
        {"title": "Set Matrix Zeroes", "difficulty": "Medium", "pattern": "Matrix", "link": "https://leetcode.com/problems/set-matrix-zeroes/"},
        {"title": "Spiral Matrix", "difficulty": "Medium", "pattern": "Matrix", "link": "https://leetcode.com/problems/spiral-matrix/"},
        {"title": "Rotate Image", "difficulty": "Medium", "pattern": "Matrix", "link": "https://leetcode.com/problems/rotate-image/"},
        {"title": "Word Search", "difficulty": "Medium", "pattern": "Matrix", "link": "https://leetcode.com/problems/word-search/"},
        {"title": "Longest Substring Without Repeating Characters", "difficulty": "Medium", "pattern": "String", "link": "https://leetcode.com/problems/longest-substring-without-repeating-characters/"},
        {"title": "Longest Repeating Character Replacement", "difficulty": "Medium", "pattern": "String", "link": "https://leetcode.com/problems/longest-repeating-character-replacement/"},
        {"title": "Minimum Window Substring", "difficulty": "Hard", "pattern": "String", "link": "https://leetcode.com/problems/minimum-window-substring/"},
        {"title": "Valid Anagram", "difficulty": "Easy", "pattern": "String", "link": "https://leetcode.com/problems/valid-anagram/"},
        {"title": "Group Anagrams", "difficulty": "Medium", "pattern": "String", "link": "https://leetcode.com/problems/group-anagrams/"},
        {"title": "Valid Parentheses", "difficulty": "Easy", "pattern": "String", "link": "https://leetcode.com/problems/valid-parentheses/"},
        {"title": "Valid Palindrome", "difficulty": "Easy", "pattern": "String", "link": "https://leetcode.com/problems/valid-palindrome/"},
        {"title": "Longest Palindromic Substring", "difficulty": "Medium", "pattern": "String", "link": "https://leetcode.com/problems/longest-palindromic-substring/"},
        {"title": "Palindromic Substrings", "difficulty": "Medium", "pattern": "String", "link": "https://leetcode.com/problems/palindromic-substrings/"},
        {"title": "Encode and Decode Strings", "difficulty": "Medium", "pattern": "String", "link": "https://leetcode.com/problems/encode-and-decode-strings/"},
        {"title": "Maximum Depth of Binary Tree", "difficulty": "Easy", "pattern": "Tree", "link": "https://leetcode.com/problems/maximum-depth-of-binary-tree/"},
        {"title": "Same Tree", "difficulty": "Easy", "pattern": "Tree", "link": "https://leetcode.com/problems/same-tree/"},
        {"title": "Invert Binary Tree", "difficulty": "Easy", "pattern": "Tree", "link": "https://leetcode.com/problems/invert-binary-tree/"},
        {"title": "Binary Tree Maximum Path Sum", "difficulty": "Hard", "pattern": "Tree", "link": "https://leetcode.com/problems/binary-tree-maximum-path-sum/"},
        {"title": "Binary Tree Level Order Traversal", "difficulty": "Medium", "pattern": "Tree", "link": "https://leetcode.com/problems/binary-tree-level-order-traversal/"},
        {"title": "Serialize and Deserialize Binary Tree", "difficulty": "Hard", "pattern": "Tree", "link": "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/"},
        {"title": "Subtree of Another Tree", "difficulty": "Easy", "pattern": "Tree", "link": "https://leetcode.com/problems/subtree-of-another-tree/"},
        {"title": "Construct Binary Tree from Preorder and Inorder Traversal", "difficulty": "Medium", "pattern": "Tree", "link": "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/"},
        {"title": "Validate Binary Search Tree", "difficulty": "Medium", "pattern": "Tree", "link": "https://leetcode.com/problems/validate-binary-search-tree/"},
        {"title": "Kth Smallest Element in a BST", "difficulty": "Medium", "pattern": "Tree", "link": "https://leetcode.com/problems/kth-smallest-element-in-a-bst/"},
        {"title": "Lowest Common Ancestor of a Binary Search Tree", "difficulty": "Easy", "pattern": "Tree", "link": "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/"},
        {"title": "Implement Trie (Prefix Tree)", "difficulty": "Medium", "pattern": "Trie", "link": "https://leetcode.com/problems/implement-trie-prefix-tree/"},
        {"title": "Design Add and Search Words Data Structure", "difficulty": "Medium", "pattern": "Trie", "link": "https://leetcode.com/problems/design-add-and-search-words-data-structure/"},
        {"title": "Word Search II", "difficulty": "Hard", "pattern": "Trie", "link": "https://leetcode.com/problems/word-search-ii/"},
        {"title": "Merge k Sorted Lists", "difficulty": "Hard", "pattern": "Heap", "link": "https://leetcode.com/problems/merge-k-sorted-lists/"},
        {"title": "Top K Frequent Elements", "difficulty": "Medium", "pattern": "Heap", "link": "https://leetcode.com/problems/top-k-frequent-elements/"},
        {"title": "Find Median from Data Stream", "difficulty": "Hard", "pattern": "Heap", "link": "https://leetcode.com/problems/find-median-from-data-stream/"}
    ]

    added_count = 0
    for p in blind_75:
        # Check if exists
        exists = await db.execute(select(models.LeetCodeProblem).filter(models.LeetCodeProblem.title == p["title"]))
        if not exists.scalars().first():
            new_problem = models.LeetCodeProblem(
                title=p["title"],
                difficulty=p["difficulty"],
                pattern=p["pattern"],
                link=p["link"],
                mastery_level=1,
                last_reviewed=datetime.utcnow(),
                next_review=datetime.utcnow(),
                notes=""
            )
            db.add(new_problem)
            added_count += 1
    
    await db.commit()
    return {"message": f"Seeded {added_count} problems from Blind 75"}
